from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import filters
from rest_framework import mixins
from rest_framework import permissions
from rest_framework import viewsets
from user_api.models import UserPreference
from user_api.serializers import UserSerializer, UserPreferenceSerializer


class ApiKeyHeaderPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        """Check for the X-Edx-Api-Key HTTP header, if required"""
        api_key = getattr(settings, "EDX_API_KEY", None)
        return api_key is None or request.META.get("HTTP_X_EDX_API_KEY") == api_key


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (ApiKeyHeaderPermission,)
    queryset = User.objects.all()
    serializer_class  = UserSerializer
    paginate_by = 10
    paginate_by_param = "page_size"


class UserPreferenceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (ApiKeyHeaderPermission,)
    queryset = UserPreference.objects.all()
    filter_backends = (filters.DjangoFilterBackend,)
    filter_fields = ("key",)
    serializer_class = UserPreferenceSerializer 
    paginate_by = 10
    paginate_by_param = "page_size"
