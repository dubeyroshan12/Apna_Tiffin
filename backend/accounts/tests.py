from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from .models import User


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.password = "Reliable-Passphrase-927!"

    def test_registers_customer_with_hashed_password_and_session(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "Asha Rao",
                "email": "ASHA@example.com",
                "password": self.password,
                "password_confirm": self.password,
                "role": "CUSTOMER",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="asha@example.com")
        self.assertNotEqual(user.password, self.password)
        self.assertTrue(user.check_password(self.password))
        self.assertNotIn("password", response.data)
        self.assertEqual(response.data["role"], User.Role.CUSTOMER)
        self.assertEqual(self.client.get("/api/auth/me/").data["user"]["id"], user.id)

    def test_registration_rejects_admin_role(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "No Admin",
                "email": "admin-try@example.com",
                "password": self.password,
                "password_confirm": self.password,
                "role": "ADMIN",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="admin-try@example.com").exists())

    def test_superuser_requires_name_and_gets_staff_permissions(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", name="Site Administrator", password=self.password
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_login_logout_and_current_user(self):
        User.objects.create_user(
            email="customer@example.com",
            name="Customer",
            role=User.Role.CUSTOMER,
            password=self.password,
        )
        invalid = self.client.post("/api/auth/login/", {"email": [], "password": self.password})
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": self.password},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get("/api/auth/me/").data, {"user": None})

    def test_registration_creates_provider_and_duplicate_registration_is_rejected(self):
        data = {
            "name": "Kitchen Provider",
            "email": "cook@example.com",
            "password": self.password,
            "password_confirm": self.password,
            "role": "PROVIDER",
        }
        registered = self.client.post("/api/auth/register/", data)
        self.assertEqual(registered.status_code, status.HTTP_201_CREATED)
        provider = User.objects.get(email="cook@example.com")
        self.assertTrue(provider.check_password(self.password))
        self.assertEqual(provider.role, User.Role.PROVIDER)
        duplicate = self.client.post("/api/auth/register/", data)
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", duplicate.data)
        self.client.post("/api/auth/logout/")
        login_response = self.client.post(
            "/api/auth/login/",
            {"email": data["email"], "password": self.password},
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        refreshed = self.client.get("/api/auth/me/")
        self.assertEqual(refreshed.data["user"]["role"], User.Role.PROVIDER)

    def test_incorrect_and_nonexistent_credentials_return_useful_error(self):
        User.objects.create_user(
            email="known@example.com",
            name="Known Customer",
            role=User.Role.CUSTOMER,
            password=self.password,
        )
        for email, password in (
            ("known@example.com", "wrong-password"),
            ("missing@example.com", self.password),
        ):
            response = self.client.post(
                "/api/auth/login/", {"email": email, "password": password}
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data["detail"], "Email or password is incorrect.")

    def test_profile_is_available_for_customer_and_provider(self):
        provider = User.objects.create_user(
            email="provider-profile@example.com",
            name="A Provider",
            role=User.Role.PROVIDER,
            password=self.password,
        )
        customer = User.objects.create_user(
            email="customer-profile@example.com",
            name="A Customer",
            role=User.Role.CUSTOMER,
            password=self.password,
        )
        self.client.force_authenticate(provider)
        provider_profile = self.client.get("/api/auth/profile/")
        self.assertEqual(provider_profile.status_code, status.HTTP_200_OK)
        self.assertEqual(provider_profile.data["role"], User.Role.PROVIDER)
        self.client.force_authenticate(customer)
        saved = self.client.patch(
            "/api/auth/profile/",
            {"name": "  Updated Customer  ", "default_address": "Room 4, Campus"},
        )
        self.assertEqual(saved.status_code, status.HTTP_200_OK)
        self.assertEqual(saved.data["name"], "Updated Customer")
        self.assertEqual(saved.data["default_address"], "Room 4, Campus")
        self.assertEqual(self.client.get("/api/auth/profile/").data["phone"], "")

    def test_login_requires_csrf_protection(self):
        User.objects.create_user(
            email="csrf@example.com",
            name="CSRF Customer",
            role=User.Role.CUSTOMER,
            password=self.password,
        )
        client = APIClient(enforce_csrf_checks=True)
        client.get("/api/auth/csrf/")
        rejected = client.post(
            "/api/auth/login/",
            {"email": "csrf@example.com", "password": self.password},
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_403_FORBIDDEN)
        token = client.cookies["csrftoken"].value
        accepted = client.post(
            "/api/auth/login/",
            {"email": "csrf@example.com", "password": self.password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
