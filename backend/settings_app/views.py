from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.serializers import serialize
from django.http import HttpResponse
from django.utils import timezone
import json

from accounts.permissions import IsSuperuser
from billing.models import Bill, BillItem
from customers.models import Customer
from masters.models import DiePrice
from tokens.models import Token

from .models import SystemSettings
from .serializers import SystemSettingsSerializer


def user_can_edit(user):
	return bool(user and user.is_authenticated and user.is_superuser)


class SystemSettingsView(APIView):
	permission_classes = [IsAuthenticated, IsSuperuser]
	parser_classes = [JSONParser, MultiPartParser, FormParser]

	def get(self, request):
		settings_obj = SystemSettings.get_solo()
		serializer = SystemSettingsSerializer(settings_obj, context={"request": request})
		return Response(
			{
				"settings": serializer.data,
				"can_edit": user_can_edit(request.user),
			}
		)

	def patch(self, request):
		if not user_can_edit(request.user):
			return Response(
				{"detail": "You do not have permission to update settings."},
				status=status.HTTP_403_FORBIDDEN,
			)

		settings_obj = SystemSettings.get_solo()
		serializer = SystemSettingsSerializer(
			settings_obj,
			data=request.data,
			partial=True,
			context={"request": request},
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response(
			{
				"settings": serializer.data,
				"can_edit": True,
			}
		)


class BusinessProfileView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		settings_obj = SystemSettings.get_solo()
		return Response(
			{
				"shop_name": settings_obj.shop_name,
				"address": settings_obj.address,
				"phone_number": settings_obj.phone_number,
			}
		)


class BillingProfileView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		settings_obj = SystemSettings.get_solo()
		return Response({
			"shop_name": settings_obj.shop_name,
			"address": settings_obj.address,
			"phone_number": settings_obj.phone_number,
			"bill_paper_size": settings_obj.bill_paper_size,
			"show_bill_header": settings_obj.show_bill_header,
			"show_bill_footer": settings_obj.show_bill_footer,
			"show_discount": settings_obj.show_discount,
			"bill_print_sound": settings_obj.bill_print_sound,
			"allow_token_edit": settings_obj.allow_token_edit,
			"currency": settings_obj.currency,
			"amount_decimal_places": settings_obj.amount_decimal_places,
		})


class DataSummaryView(APIView):
	permission_classes = [IsAuthenticated, IsSuperuser]

	def get(self, request):
		return Response({
			"customers": Customer.objects.count(),
			"tokens": Token.objects.count(),
			"bills": Bill.objects.count(),
			"bill_items": BillItem.objects.count(),
			"die_prices": DiePrice.objects.count(),
		})


class DataBackupView(APIView):
	permission_classes = [IsAuthenticated, IsSuperuser]

	def get(self, request):
		payload = {
			"format": "nellore-die-cutting-backup-v1",
			"created_at": timezone.now().isoformat(),
			"data": {
				"customers": serialize("json", Customer.objects.all()),
				"tokens": serialize("json", Token.objects.all()),
				"die_prices": serialize("json", DiePrice.objects.all()),
				"bills": serialize("json", Bill.objects.all()),
				"bill_items": serialize("json", BillItem.objects.all()),
				"settings": serialize("json", SystemSettings.objects.all()),
			},
		}
		response = HttpResponse(json.dumps(payload), content_type="application/json")
		response["Content-Disposition"] = 'attachment; filename="nellore-die-cutting-backup.json"'
		return response


class WeighingMachineConfigView(APIView):
	# Staff (Billing / Gold Return) need these values to connect to the
	# weighing machine and to know whether manual weight entry is
	# permitted. Full settings management remains superuser-only.
	permission_classes = [IsAuthenticated]

	def get(self, request):
		settings_obj = SystemSettings.get_solo()
		return Response(
			{
				"weighing_machine_enabled": settings_obj.weighing_machine_enabled,
				"machine_port": settings_obj.machine_port,
				"machine_baud_rate": settings_obj.machine_baud_rate,
				"machine_parity": settings_obj.machine_parity,
				"machine_data_bits": settings_obj.machine_data_bits,
				"machine_stop_bits": settings_obj.machine_stop_bits,
				"machine_read_timeout_ms": settings_obj.machine_read_timeout_ms,
				"machine_stable_read_count": settings_obj.machine_stable_read_count,
				"allow_manual_weight_entry": settings_obj.allow_manual_weight_entry,
				"allow_token_edit": settings_obj.allow_token_edit,
				"weight_decimal_places": settings_obj.weight_decimal_places,
				"weight_unit": settings_obj.weight_unit,
			}
		)


class SystemSettingsLogoUploadView(APIView):
	permission_classes = [IsAuthenticated, IsSuperuser]
	parser_classes = [MultiPartParser, FormParser]

	def post(self, request):
		if not user_can_edit(request.user):
			return Response(
				{"detail": "You do not have permission to update settings."},
				status=status.HTTP_403_FORBIDDEN,
			)

		logo_file = request.FILES.get("logo")
		if not logo_file:
			return Response(
				{"detail": "Logo file is required."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		settings_obj = SystemSettings.get_solo()
		settings_obj.logo = logo_file
		settings_obj.save()

		serializer = SystemSettingsSerializer(settings_obj, context={"request": request})
		return Response(
			{
				"settings": serializer.data,
				"can_edit": True,
			}
		)
