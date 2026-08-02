from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(
	EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
	DEFAULT_FROM_EMAIL="no-reply@example.com",
	FRONTEND_URL="http://frontend.test",
)
class AccountRecoveryTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.staff = user_model.objects.create_user(
			username="staff-user",
			email="staff@example.com",
			password="CurrentPassword123!",
		)

	def test_initial_admin_setup_creates_the_first_superuser(self):
		response = self.client.post(
			reverse("admin-setup"),
			{
				"username": "new-admin",
				"email": "admin@example.com",
				"password": "SecureAdmin123!",
				"confirm_password": "SecureAdmin123!",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		admin = get_user_model().objects.get(username="new-admin")
		self.assertTrue(admin.is_superuser)
		self.assertTrue(admin.is_staff)
		self.assertIn("access", response.data)
		self.assertEqual(response.data["user"]["username"], "new-admin")

	def test_initial_admin_setup_is_blocked_after_an_admin_exists(self):
		get_user_model().objects.create_superuser(
			username="existing-admin",
			email="existing-admin@example.com",
			password="SecureAdmin123!",
		)

		response = self.client.post(
			reverse("admin-setup"),
			{
				"username": "another-admin",
				"email": "another-admin@example.com",
				"password": "SecureAdmin123!",
				"confirm_password": "SecureAdmin123!",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertFalse(
			get_user_model().objects.filter(username="another-admin").exists()
		)

	def test_password_reset_request_sends_a_reset_link_to_registered_email(self):
		response = self.client.post(
			reverse("password-reset-request"),
			{"email": self.staff.email},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(mail.outbox), 1)
		self.assertEqual(mail.outbox[0].to, [self.staff.email])
		self.assertIn("/reset-password/", mail.outbox[0].body)

	def test_password_reset_confirmation_updates_the_password(self):
		uid = urlsafe_base64_encode(force_bytes(self.staff.pk))
		token = default_token_generator.make_token(self.staff)

		response = self.client.post(
			reverse("password-reset-confirm"),
			{
				"uid": uid,
				"token": token,
				"password": "UpdatedPassword123!",
				"confirm_password": "UpdatedPassword123!",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.staff.refresh_from_db()
		self.assertTrue(self.staff.check_password("UpdatedPassword123!"))
