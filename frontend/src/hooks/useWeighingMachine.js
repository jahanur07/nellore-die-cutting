import { useCallback, useEffect, useRef, useState } from "react";

// Web Serial API is only available on Chrome/Edge over HTTPS or localhost.
// On unsupported browsers we simply report "unsupported" so the caller can
// fall back to manual weight entry.
const isSerialSupported = () =>
  typeof navigator !== "undefined" && "serial" in navigator;

const PARITY_MAP = {
  NONE: "none",
  EVEN: "even",
  ODD: "odd",
};

// Digital weighing scales commonly stream ASCII lines such as
// "ST,GS,+00012.345,g", MT-SICS "S S      0.180 g", or plain "12.345".
// Return grams because the application stores all weights in grams.
const extractWeight = (line) => {
  const text = String(line).trim();
  const match = text.match(/[+-]?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  if (!Number.isFinite(value)) return null;
  return /(?:^|[\s,])kg(?:$|[\s,])/i.test(text) ? value * 1000 : value;
};

// Reads live weight from a serial weighing machine using the Web Serial API.
// Returns connection status, the latest raw reading, and a "stable" reading
// once N consecutive samples agree (N = stableReadCount), which is what
// should actually be used for Gold Return.
export default function useWeighingMachine({
  baudRate = 9600,
  parity = "NONE",
  dataBits = 8,
  stopBits = 1,
  stableReadCount = 3,
  readTimeoutMs = 1500,
} = {}) {
  const [status, setStatus] = useState("idle");
  // idle | connecting | connected | no-signal | reading-error | error | disconnected | unsupported
  const [liveWeight, setLiveWeight] = useState(null);
  const [stableWeight, setStableWeight] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const keepReadingRef = useRef(false);
  const bufferRef = useRef([]);
  const watchdogRef = useRef(null);

  const supported = isSerialSupported();

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const armWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      setStatus((current) => (current === "connected" ? "no-signal" : current));
    }, Math.max(readTimeoutMs, 500) * 4);
  }, [clearWatchdog, readTimeoutMs]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (writerRef.current) {
      try {
        writerRef.current.releaseLock();
      } catch {
        // ignore
      }
      writerRef.current = null;
    }
  }, []);

  const stopReading = useCallback(async () => {
    keepReadingRef.current = false;
    clearWatchdog();
    stopPolling();

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {
        // ignore
      }
      try {
        readerRef.current.releaseLock();
      } catch {
        // ignore
      }
      readerRef.current = null;
    }
  }, [clearWatchdog, stopPolling]);

  const disconnect = useCallback(async () => {
    await stopReading();

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {
        // ignore
      }
      portRef.current = null;
    }

    bufferRef.current = [];
    setLiveWeight(null);
    setStableWeight(null);
    setStatus("disconnected");
  }, [stopReading]);

  const readLoop = useCallback(
    async (port) => {
      const textDecoder = new TextDecoderStream();
      const readableClosed = port.readable.pipeTo(textDecoder.writable).catch(() => {});
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let partial = "";
      keepReadingRef.current = true;
      armWatchdog();

      try {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          armWatchdog();

          partial += value;
          const lines = partial.split(/\r\n|\r|\n/);
          partial = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const weight = extractWeight(line);
            if (weight === null) continue;

            setLiveWeight(weight);
            setStatus("connected");

            const nextBuffer = [...bufferRef.current, weight].slice(-stableReadCount);
            bufferRef.current = nextBuffer;

            if (
              nextBuffer.length === stableReadCount &&
              nextBuffer.every((w) => Math.abs(w - nextBuffer[0]) < 0.001)
            ) {
              setStableWeight(nextBuffer[0]);
            }
          }
        }
      } catch (err) {
        if (keepReadingRef.current) {
          setErrorMessage(err?.message || "Lost connection to weighing machine.");
          setStatus("reading-error");
        }
      } finally {
        clearWatchdog();
        try {
          reader.releaseLock();
        } catch {
          // ignore
        }
        await readableClosed;
      }
    },
    [armWatchdog, clearWatchdog, stableReadCount]
  );

  const connect = useCallback(async () => {
    if (!supported) {
      setStatus("unsupported");
      setErrorMessage(
        "This browser does not support Web Serial. Use Chrome or Edge (HTTPS or localhost) to connect the weighing machine."
      );
      return;
    }

    setErrorMessage("");
    setStatus("connecting");
    bufferRef.current = [];
    setStableWeight(null);
    setLiveWeight(null);

    try {
      const port = await navigator.serial.requestPort();

      await port.open({
        baudRate: Number(baudRate) || 9600,
        dataBits: Number(dataBits) || 8,
        stopBits: Number(stopBits) || 1,
        parity: PARITY_MAP[parity] || "none",
      });

      portRef.current = port;
      setStatus("connected");

      readLoop(port);

      // The JE3002GE commonly waits for an MT-SICS host request. Listening
      // only for unsolicited output leaves the port open but produces no
      // weight, which is the client's reported "Connected / No signal" case.
      if (port.writable) {
        const writer = port.writable.getWriter();
        writerRef.current = writer;
        const requestWeight = async () => {
          try {
            await writer.write(new TextEncoder().encode("SI\r\n"));
          } catch {
            // The read loop will surface a connection error if the port closes.
          }
        };
        await requestWeight();
        pollTimerRef.current = setInterval(requestWeight, 1000);
      }
    } catch (err) {
      if (err?.name === "NotFoundError") {
        // User closed the "select a port" dialog without choosing one.
        setStatus("idle");
        return;
      }

      setErrorMessage(err?.message || "Unable to connect to weighing machine.");
      setStatus("error");
    }
  }, [supported, baudRate, dataBits, stopBits, parity, readLoop]);

  useEffect(() => {
    return () => {
      stopReading();
      if (portRef.current) {
        portRef.current.close().catch(() => {});
        portRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    supported,
    status,
    liveWeight,
    stableWeight,
    errorMessage,
    connect,
    disconnect,
  };
}
