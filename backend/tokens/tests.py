from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer

from .models import Token


class TokenCreationTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(
			username="token-staff",
			password="password",
		)
		self.customer = Customer.objects.create(
			name="Token Test Customer",
			mobile="9876543210",
			created_by=self.user,
		)
		self.client.force_authenticate(user=self.user)

	def test_creates_token_for_selected_customer(self):
		response = self.client.post(
			reverse("token-list-create"),
			{
				"customer": self.customer.pk,
				"gold_weight": "1.250",
				"remarks": "Manual entry",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		token = Token.objects.get(pk=response.data["id"])
		self.assertEqual(token.customer, self.customer)
		self.assertEqual(token.customer_name, self.customer.name)
		self.assertEqual(token.customer_mobile, self.customer.mobile)
		self.assertEqual(str(token.gold_weight), "1.250")

	def test_looks_up_token_by_number_with_its_customer(self):
		token = Token.objects.create(
			customer=self.customer,
			customer_mobile=self.customer.mobile,
			customer_name=self.customer.name,
			gold_weight="1.250",
			created_by=self.user,
		)

		response = self.client.get(
			reverse(
				"token-by-number",
				kwargs={"token_number": token.token_number.lower()},
			)
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["id"], token.id)
		self.assertEqual(response.data["customer"], self.customer.id)
		self.assertEqual(response.data["customer_name"], self.customer.name)
		self.assertEqual(response.data["customer_mobile"], self.customer.mobile)

	def test_direct_customer_details_create_and_link_a_customer(self):
		response = self.client.post(
			reverse("token-list-create"),
			{
				"customer_name": "New Token Customer",
				"customer_mobile": "9123456780",
				"customer_address": "Main Road, Nellore",
				"gold_weight": "1.500",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		customer = Customer.objects.get(mobile="9123456780")
		token = Token.objects.get(pk=response.data["id"])
		self.assertEqual(customer.name, "New Token Customer")
		self.assertEqual(customer.address, "Main Road, Nellore")
		self.assertEqual(token.customer, customer)
		self.assertEqual(response.data["customer_code"], customer.customer_code)

	def test_direct_customer_details_reuse_existing_mobile(self):
		response = self.client.post(
			reverse("token-list-create"),
			{
				"customer_name": "Different Name",
				"customer_mobile": self.customer.mobile,
				"customer_address": "Different Address",
				"gold_weight": "1.500",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(Customer.objects.filter(mobile=self.customer.mobile).count(), 1)
		token = Token.objects.get(pk=response.data["id"])
		self.assertEqual(token.customer, self.customer)
