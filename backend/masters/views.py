from rest_framework import generics
from rest_framework.permissions import (
    IsAuthenticated,
    SAFE_METHODS,
)
from rest_framework.filters import SearchFilter
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from django.db import transaction

from accounts.permissions import IsSuperuser

from .models import DiePrice
from .serializers import DiePriceSerializer


# Lists all die prices and handles creating new ones.
# GET  /api/masters/die-prices/  — returns all die prices, sorted alphabetically
# POST /api/masters/die-prices/  — creates a new die price entry
class DiePriceListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = DiePriceSerializer
    permission_classes = [IsAuthenticated]

    # Enables searching die prices by die code or name
    filter_backends = [SearchFilter]

    search_fields = [
        "die_code",
        "name",
    ]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsSuperuser()]

    def get_queryset(self):
        # select_related avoids extra DB queries for created_by
        return DiePrice.objects.select_related(
            "created_by"
        ).order_by("name")  # Alphabetical order

    def perform_create(self, serializer):
        # Automatically set created_by to the logged-in staff member
        serializer.save(
            created_by=self.request.user
        )


# Retrieve, update, or delete a single die price by ID.
# GET/PATCH/DELETE /api/masters/die-prices/<id>/
class DiePriceDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = DiePriceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsSuperuser()]

    def get_queryset(self):

        return DiePrice.objects.select_related(
            "created_by"
        )


class DiePriceExcelImportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSuperuser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Please select an Excel file."}, status=status.HTTP_400_BAD_REQUEST)
        if not upload.name.lower().endswith((".xlsx", ".xlsm")):
            return Response({"detail": "Only .xlsx or .xlsm files are supported."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > 5 * 1024 * 1024:
            return Response({"detail": "Excel file must be smaller than 5 MB."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from openpyxl import load_workbook
            workbook = load_workbook(upload, read_only=True, data_only=True)
            sheet = workbook.active
            rows = list(sheet.iter_rows(values_only=True))
        except Exception:
            return Response({"detail": "Unable to read this Excel file."}, status=status.HTTP_400_BAD_REQUEST)

        if not rows:
            return Response({"detail": "The Excel sheet is empty."}, status=status.HTTP_400_BAD_REQUEST)

        headers = [str(value or "").strip().lower().replace(" ", "_") for value in rows[0]]
        required = {"name", "rate"}
        missing = sorted(required - set(headers))
        if missing:
            return Response({"detail": f"Missing required column(s): {', '.join(missing)}. Use name, rate, and optional die_code/is_active."}, status=status.HTTP_400_BAD_REQUEST)

        column = {name: index for index, name in enumerate(headers)}
        prepared = []
        errors = []
        seen_names = set()
        seen_codes = set()

        for row_number, values in enumerate(rows[1:], start=2):
            if not any(value not in (None, "") for value in values):
                continue
            name = str(values[column["name"]] or "").strip()
            raw_rate = values[column["rate"]]
            code = str(values[column["die_code"]] or "").strip() if "die_code" in column else ""
            active_value = values[column["is_active"]] if "is_active" in column else True
            active_text = str(active_value).strip().lower()
            is_active = active_value is not None and active_text not in {"false", "0", "no", "inactive"}

            if len(name) < 2:
                errors.append(f"Row {row_number}: name is required.")
                continue
            if name.lower() in seen_names or DiePrice.objects.filter(name__iexact=name).exists():
                errors.append(f"Row {row_number}: die/work name already exists ({name}).")
                continue
            try:
                rate = Decimal(str(raw_rate)).quantize(Decimal("0.01"))
                if rate <= 0:
                    raise InvalidOperation
            except (InvalidOperation, ValueError, TypeError):
                errors.append(f"Row {row_number}: rate must be greater than zero.")
                continue
            if code and (code in seen_codes or DiePrice.objects.filter(die_code=code).exists()):
                errors.append(f"Row {row_number}: die code already exists ({code}).")
                continue

            seen_names.add(name.lower())
            if code:
                seen_codes.add(code)
            prepared.append({"name": name, "rate": rate, "is_active": is_active, "die_code": code})

        if errors:
            return Response({"detail": "Import was not completed. Fix the Excel rows and try again.", "errors": errors[:50]}, status=status.HTTP_400_BAD_REQUEST)
        if not prepared:
            return Response({"detail": "No valid die rows were found."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for item in prepared:
                DiePrice.objects.create(created_by=request.user, **item)

        return Response({"detail": f"{len(prepared)} die/work item(s) imported successfully.", "created": len(prepared)}, status=status.HTTP_201_CREATED)
