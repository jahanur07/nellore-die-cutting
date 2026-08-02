from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DiePrice


class DiePricePermissionTests(APITestCase):
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
		self.list_url = reverse("die-price-list-create")
		self.die_price = DiePrice.objects.create(
			name="Existing Die",
			rate="10.00",
			created_by=self.admin,
		)

	def test_staff_can_read_die_prices_for_billing(self):
		self.client.force_authenticate(user=self.staff)

		response = self.client.get(self.list_url)

		self.assertEqual(response.status_code, status.HTTP_200_OK)

	def test_staff_cannot_create_update_or_delete_die_prices(self):
		self.client.force_authenticate(user=self.staff)
		detail_url = reverse(
			"die-price-detail",
			kwargs={"pk": self.die_price.pk},
		)

		create_response = self.client.post(
			self.list_url,
			{"name": "Staff Die", "rate": "12.50"},
			format="json",
		)
		update_response = self.client.patch(
			detail_url,
			{"rate": "15.00"},
			format="json",
		)
		delete_response = self.client.delete(detail_url)

		self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertFalse(DiePrice.objects.filter(name="Staff Die").exists())
		self.die_price.refresh_from_db()
		self.assertEqual(str(self.die_price.rate), "10.00")

	def test_superuser_can_manage_die_prices(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(
			self.list_url,
			{"name": "Admin Die", "rate": "12.50"},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(DiePrice.objects.filter(name="Admin Die").exists())
