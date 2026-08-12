from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated

from .models import Token
from .serializers import TokenSerializer
from settings_app.models import SystemSettings


# Lists all tokens and handles creation of new tokens.
# GET  /api/tokens/  — returns all tokens, newest first
# POST /api/tokens/  — creates a new token (gold deposit)
class TokenListCreateView(generics.ListCreateAPIView):

    serializer_class = TokenSerializer
    permission_classes = [IsAuthenticated]  # Only logged-in staff can access

    def get_queryset(self):
        # select_related avoids extra DB queries for related fields
        return Token.objects.select_related(
            "created_by",
            "customer"
        ).order_by("-created_at", "-id")  # Newest first

    def perform_create(self, serializer):
        # Automatically set created_by to the logged-in staff member
        serializer.save(
            created_by=self.request.user
        )


class TokenDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TokenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Token.objects.select_related("created_by", "customer")

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser and not SystemSettings.get_solo().allow_token_edit:
            return Response(
                {"detail": "Token editing is disabled by the administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


# Returns all tokens belonging to a specific customer.
# Used by the Billing page to show which tokens a customer can bill against.
# GET /api/tokens/customer/<customer_id>/
class CustomerTokenListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id):

        tokens = Token.objects.filter(
            customer_id=customer_id
        ).select_related(
            "customer",
            "created_by"
        ).order_by("-created_at", "-id")

        serializer = TokenSerializer(
            tokens,
            many=True
        )

        return Response(serializer.data)


class TokenByNumberView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, token_number):
        normalized_number = token_number.strip().upper()
        try:
            token = Token.objects.select_related(
                "customer",
                "created_by",
            ).get(token_number__iexact=normalized_number)
        except Token.DoesNotExist:
            # Accept legacy tokens stored as TK-0020 while the billing field
            # consistently uses the new TK0020 format.
            digits = "".join(character for character in normalized_number if character.isdigit())
            if not digits or not normalized_number.startswith("TK"):
                return Response(
                    {"detail": "Token number not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            try:
                token = Token.objects.select_related(
                    "customer",
                    "created_by",
                ).get(token_number__iexact=f"TK-{digits}")
            except Token.DoesNotExist:
                return Response(
                    {"detail": "Token number not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not token.customer_id:
            return Response(
                {"detail": "This token is not linked to a registered customer."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(TokenSerializer(token).data)
