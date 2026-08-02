from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import Bill
from tokens.models import Token


def parse_iso_date(value, fallback):
	if not value:
		return fallback

	try:
		return date.fromisoformat(value)
	except (TypeError, ValueError):
		return fallback


def format_decimal(value, digits):
	if value is None:
		value = Decimal("0")

	quant = Decimal("1") if digits == 0 else Decimal(f"1.{'0' * digits}")
	normalized = Decimal(value).quantize(quant)
	return f"{normalized:.{digits}f}"


def format_currency(value):
	return format_decimal(value, 2)


def format_weight(value):
	return format_decimal(value, 3)


def to_aware_range(start_date, end_date):
	tz = timezone.get_current_timezone()
	start_naive = datetime.combine(start_date, time.min)
	end_naive = datetime.combine(end_date, time.max)
	start_dt = timezone.make_aware(start_naive, tz)
	end_dt = timezone.make_aware(end_naive, tz)
	return start_dt, end_dt


class ReportSummaryView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		today = timezone.localdate()
		mode = (request.query_params.get("mode") or "daily").lower()

		def parse_int(value, fallback):
			try:
				return int(value)
			except (TypeError, ValueError):
				return fallback

		if mode == "monthly":
			month = parse_int(request.query_params.get("month"), today.month)
			year = parse_int(request.query_params.get("year"), today.year)

			month = max(1, min(month, 12))

			start_date = date(year, month, 1)
			if month == 12:
				end_date = date(year + 1, 1, 1) - timedelta(days=1)
			else:
				end_date = date(year, month + 1, 1) - timedelta(days=1)
		elif mode in {"date_range", "custom"}:
			start_date = parse_iso_date(request.query_params.get("start_date"), today)
			end_date = parse_iso_date(request.query_params.get("end_date"), start_date)
		else:
			start_date = parse_iso_date(request.query_params.get("date"), today)
			end_date = start_date

		if start_date > end_date:
			start_date, end_date = end_date, start_date

		start_dt, end_dt = to_aware_range(start_date, end_date)

		token_qs = Token.objects.filter(created_at__range=(start_dt, end_dt)).select_related("customer")
		bill_qs = Bill.objects.filter(created_at__range=(start_dt, end_dt)).select_related("customer", "token")

		token_count = token_qs.count()
		bill_count = bill_qs.count()

		gold_deposit_total = token_qs.aggregate(total=Sum("gold_weight"))["total"] or Decimal("0.000")
		gold_return_total = bill_qs.aggregate(total=Sum("gold_return"))["total"] or Decimal("0.000")

		billing_total_amount = bill_qs.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
		billing_final_amount = bill_qs.aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")

		cash_total = bill_qs.filter(payment_method="CASH").aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")
		online_total = bill_qs.filter(payment_method="ONLINE").aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")

		if billing_final_amount > 0:
			cash_percentage = (cash_total / billing_final_amount) * Decimal("100")
			online_percentage = (online_total / billing_final_amount) * Decimal("100")
		else:
			cash_percentage = Decimal("0.00")
			online_percentage = Decimal("0.00")

		is_single_day = start_date == end_date

		if is_single_day:
			hour_labels = [
				(10, "10 AM"),
				(11, "11 AM"),
				(12, "12 PM"),
				(13, "1 PM"),
				(14, "2 PM"),
				(15, "3 PM"),
				(16, "4 PM"),
				(17, "5 PM"),
				(18, "6 PM"),
			]

			token_by_hour = {
				timezone.localtime(row["hour"]).hour: row["total"] or Decimal("0.000")
				for row in token_qs.annotate(hour=TruncHour("created_at"))
				.values("hour")
				.annotate(total=Sum("gold_weight"))
			}

			bill_by_hour = {
				timezone.localtime(row["hour"]).hour: row["total"] or Decimal("0.000")
				for row in bill_qs.annotate(hour=TruncHour("created_at"))
				.values("hour")
				.annotate(total=Sum("gold_return"))
			}

			weight_chart = [
				{
					"label": label,
					"deposit": float(token_by_hour.get(hour, Decimal("0.000"))),
					"return": float(bill_by_hour.get(hour, Decimal("0.000"))),
				}
				for hour, label in hour_labels
			]
		else:
			token_by_day = {
				row["day"]: row["total"] or Decimal("0.000")
				for row in token_qs.annotate(day=TruncDate("created_at"))
				.values("day")
				.annotate(total=Sum("gold_weight"))
			}
			bill_by_day = {
				row["day"]: row["total"] or Decimal("0.000")
				for row in bill_qs.annotate(day=TruncDate("created_at"))
				.values("day")
				.annotate(total=Sum("gold_return"))
			}

			labels = sorted(set(token_by_day.keys()) | set(bill_by_day.keys()))

			weight_chart = [
				{
					"label": item.strftime("%d %b"),
					"deposit": float(token_by_day.get(item, Decimal("0.000"))),
					"return": float(bill_by_day.get(item, Decimal("0.000"))),
				}
				for item in labels
			]

		recent_tokens = [
			{
				"id": token.id,
				"token_number": token.token_number,
				"time": timezone.localtime(token.created_at).strftime("%I:%M %p").lstrip("0"),
				"customer_mobile": token.customer_mobile,
				"gold_deposit": format_weight(token.gold_weight),
			}
			for token in token_qs.order_by("-created_at")[:5]
		]

		recent_bills = [
			{
				"id": bill.id,
				"bill_number": bill.bill_number,
				"time": timezone.localtime(bill.created_at).strftime("%I:%M %p").lstrip("0"),
				"customer_mobile": bill.customer.mobile,
				"final_amount": format_currency(bill.final_amount),
				"payment_method": bill.payment_method,
			}
			for bill in bill_qs.order_by("-created_at")[:5]
		]

		net_weight = gold_deposit_total - gold_return_total
		average_bill = (billing_final_amount / bill_count) if bill_count else Decimal("0.00")
		average_token_weight = (gold_deposit_total / token_count) if token_count else Decimal("0.000")

		response_data = {
			"mode": mode,
			"period": {
				"start_date": start_date.isoformat(),
				"end_date": end_date.isoformat(),
				"is_single_day": is_single_day,
			},
			"gold_deposit": {
				"total": format_weight(gold_deposit_total),
				"transactions": token_count,
			},
			"gold_return": {
				"total": format_weight(gold_return_total),
				"transactions": bill_count,
			},
			"billing": {
				"total_amount": format_currency(billing_total_amount),
				"final_amount": format_currency(billing_final_amount),
				"transactions": bill_count,
			},
			"payments": {
				"cash": format_currency(cash_total),
				"online": format_currency(online_total),
				"cash_percentage": format_decimal(cash_percentage, 2),
				"online_percentage": format_decimal(online_percentage, 2),
			},
			"weight_chart": weight_chart,
			"recent_tokens": recent_tokens,
			"recent_bills": recent_bills,
			"statistics": {
				"net_weight": format_weight(net_weight),
				"average_bill": format_currency(average_bill),
				"average_token_weight": format_weight(average_token_weight),
			},
			"totals": {
				"token_count": token_count,
				"token_weight": format_weight(gold_deposit_total),
				"bill_count": bill_count,
				"bill_final_amount": format_currency(billing_final_amount),
			},
		}

		return Response(response_data)
