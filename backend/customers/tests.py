from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from billing.models import Bill
from tokens.models import Token

from .models import Customer


class CustomerDeletionTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(
			username="customer-staff",
			password="password",
		)
		self.admin = user_model.objects.create_superuser(
			username="customer-admin",
			email="admin@example.com",
			password="password",
		)
		self.client.force_authenticate(user=self.user)

	def create_customer(self):
		return Customer.objects.create(
			name="Delete Test Customer",
			mobile="9876543210",
			created_by=self.user,
		)

	def test_deletes_customer_without_transaction_history(self):
		customer = self.create_customer()
		self.client.force_authenticate(user=self.admin)

		response = self.client.delete(
			reverse("customer-detail", kwargs={"pk": customer.pk})
		)

		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(Customer.objects.filter(pk=customer.pk).exists())

	def test_staff_cannot_delete_customer(self):
		customer = self.create_customer()

		response = self.client.delete(
			reverse("customer-detail", kwargs={"pk": customer.pk})
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertTrue(Customer.objects.filter(pk=customer.pk).exists())

	def test_returns_clear_conflict_for_customer_with_token_history(self):
		customer = self.create_customer()
		Token.objects.create(
			customer=customer,
			customer_mobile=customer.mobile,
			customer_name=customer.name,
			gold_weight="1.000",
			created_by=self.user,
		)
		self.client.force_authenticate(user=self.admin)

		response = self.client.delete(
			reverse("customer-detail", kwargs={"pk": customer.pk})
		)

		self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
		self.assertIn("token", response.data["detail"].lower())
		self.assertTrue(Customer.objects.filter(pk=customer.pk).exists())

	def test_looks_up_customer_by_visible_customer_id(self):
		customer = self.create_customer()

		response = self.client.get(
			reverse(
				"customer-by-id",
				kwargs={"customer_id": customer.customer_code.lower()},
			)
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["id"], customer.id)
		self.assertEqual(response.data["customer_code"], customer.customer_code)


class CustomerAdminSummaryTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.admin = user_model.objects.create_superuser(
			username="customer-admin",
			email="admin@example.com",
			password="password",
		)
		self.staff = user_model.objects.create_user(
			username="customer-staff",
			password="password",
		)
		self.customer = Customer.objects.create(
			name="Summary Customer",
			mobile="9876543210",
			created_by=self.staff,
		)
		self.token = Token.objects.create(
			customer=self.customer,
			customer_mobile=self.customer.mobile,
			customer_name=self.customer.name,
			gold_weight="2.000",
			created_by=self.staff,
		)
		Bill.objects.create(
			customer=self.customer,
			token=self.token,
			gold_return="1.000",
			total_amount="125.00",
			discount="0.00",
			final_amount="125.00",
			payment_method="CASH",
			created_by=self.staff,
		)
		self.summary_url = reverse("admin-customer-summary")

	def test_admin_summary_automatically_includes_token_and_bill_activity(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.get(self.summary_url)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["summary"]["total_customers"], 1)
		self.assertEqual(response.data["summary"]["active_customers"], 1)
		self.assertEqual(response.data["summary"]["total_transactions"], 2)
		self.assertEqual(response.data["summary"]["total_billing_amount"], "125.00")
		self.assertEqual(response.data["customers"][0]["customer_code"], self.customer.customer_code)
		self.assertEqual(response.data["customers"][0]["total_tokens"], 1)
		self.assertEqual(response.data["customers"][0]["total_bills"], 1)
		self.assertEqual(response.data["customers"][0]["total_billing_amount"], "125.00")
		self.assertIsNotNone(response.data["customers"][0]["last_visit"])

	def test_staff_cannot_access_admin_customer_summary(self):
		self.client.force_authenticate(user=self.staff)

		response = self.client.get(self.summary_url)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_staff_can_access_customer_summary_without_admin_actions(self):
		self.client.force_authenticate(user=self.staff)

		response = self.client.get(reverse("staff-customer-summary"))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["summary"]["total_customers"], 1)
		self.assertEqual(response.data["customers"][0]["id"], self.customer.id)
		self.assertFalse(response.data["customers"][0]["staff_edit_unlocked"])

	def test_staff_cannot_edit_a_customer_until_admin_unlocks_it(self):
		detail_url = reverse("customer-detail", kwargs={"pk": self.customer.pk})
		self.client.force_authenticate(user=self.staff)

		locked_response = self.client.patch(
			detail_url,
			{"name": "Locked Customer"},
			format="json",
		)

		self.assertEqual(locked_response.status_code, status.HTTP_403_FORBIDDEN)
		self.customer.refresh_from_db()
		self.assertEqual(self.customer.name, "Summary Customer")

		self.client.force_authenticate(user=self.admin)
		unlock_response = self.client.patch(
			reverse("customer-staff-edit-access", kwargs={"pk": self.customer.pk}),
			{"staff_edit_unlocked": True},
			format="json",
		)

		self.assertEqual(unlock_response.status_code, status.HTTP_200_OK)
		self.assertTrue(unlock_response.data["staff_edit_unlocked"])

		self.client.force_authenticate(user=self.staff)
		unlocked_response = self.client.patch(
			detail_url,
			{"name": "Unlocked Customer"},
			format="json",
		)

		self.assertEqual(unlocked_response.status_code, status.HTTP_200_OK)
		self.customer.refresh_from_db()
		self.assertEqual(self.customer.name, "Unlocked Customer")

	def test_staff_cannot_change_customer_edit_access(self):
		self.client.force_authenticate(user=self.staff)

		response = self.client.patch(
			reverse("customer-staff-edit-access", kwargs={"pk": self.customer.pk}),
			{"staff_edit_unlocked": True},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
