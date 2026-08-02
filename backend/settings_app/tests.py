from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import SystemSettings


class SystemSettingsPermissionTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.admin = user_model.objects.create_superuser(
			username="admin",
			email="admin@example.com",
			password="password",
		)
		self.staff = user_model.objects.create_user(
			username="staff",
			email="staff@example.com",
			password="password",
		)
		self.settings_url = reverse("system-settings")

	def test_staff_cannot_view_or_update_settings(self):
		self.client.force_authenticate(user=self.staff)

		get_response = self.client.get(self.settings_url)
		patch_response = self.client.patch(
			self.settings_url,
			{"shop_name": "Staff Change"},
			format="json",
		)

		self.assertEqual(get_response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)

	def test_superuser_can_view_and_update_settings(self):
		self.client.force_authenticate(user=self.admin)

		get_response = self.client.get(self.settings_url)
		patch_response = self.client.patch(
			self.settings_url,
			{"shop_name": "Admin Change"},
			format="json",
		)

		self.assertEqual(get_response.status_code, status.HTTP_200_OK)
		self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
		self.assertEqual(patch_response.data["settings"]["shop_name"], "Admin Change")

	def test_staff_can_read_business_profile_for_receipts(self):
		settings_obj = SystemSettings.get_solo()
		settings_obj.shop_name = "Nellore Die Cutting"
		settings_obj.address = "Main Road, Nellore"
		settings_obj.phone_number = "9876543210"
		settings_obj.save()
		self.client.force_authenticate(user=self.staff)

		response = self.client.get(reverse("business-profile"))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(
			response.data,
			{
				"shop_name": "Nellore Die Cutting",
				"address": "Main Road, Nellore",
				"phone_number": "9876543210",
			},
		)
