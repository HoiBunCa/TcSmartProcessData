from django.shortcuts import render
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status


class Process(viewsets.ModelViewSet):

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def doing(self, request, *args, **kwargs):
        return Response({"a": "b"}, status=200)
