"""
Vues d'authentification : inscription (création de compte).
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Body: { "username": str, "password": str, "password_confirm": str, "email": str (optionnel) }
    Crée un utilisateur et retourne 201. Pas d'auth requise (AllowAny).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password')
        password_confirm = request.data.get('password_confirm')
        email = (request.data.get('email') or '').strip() or None

        errors = {}
        if not username:
            errors['username'] = 'Le nom d\'utilisateur est obligatoire.'
        if not password:
            errors['password'] = 'Le mot de passe est obligatoire.'
        elif password_confirm is not None and password != password_confirm:
            errors['password_confirm'] = 'Les deux mots de passe ne correspondent pas.'
        if len(username) > 150:
            errors['username'] = 'Nom d\'utilisateur trop long.'

        if errors:
            return Response(
                {'detail': next(iter(errors.values())), **errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            msg = 'Ce nom d\'utilisateur est déjà pris.'
            return Response(
                {'detail': msg, 'username': msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email or '',
            )
            # Premier utilisateur : pas d'admin existant → on en fait un superuser (évite le blocage après drop DB).
            if not User.objects.filter(is_superuser=True).exists():
                user.is_staff = True
                user.is_superuser = True
                user.save(update_fields=['is_staff', 'is_superuser'])
        except Exception as e:
            msg = str(e)
            return Response(
                {'detail': msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'detail': 'Compte créé. Vous pouvez vous connecter.'},
            status=status.HTTP_201_CREATED,
        )
