package services

type AuthResult struct {
	Username string
	Role     string
	Token    string
}

type AuthService interface {
	Authenticate(username, password string) (*AuthResult, bool)
	ValidateToken(token string) (username string, role string, ok bool)
}

type authService struct {
	credentials map[string]string
	roles       map[string]string
}

func NewAuthService() AuthService {
	return &authService{
		credentials: map[string]string{
			"manager": "1234",
			"sales":   "1234",
		},
		roles: map[string]string{
			"manager": "manager",
			"sales":   "sales",
		},
	}
}

func (s *authService) Authenticate(username, password string) (*AuthResult, bool) {
	expected, ok := s.credentials[username]
	if !ok || expected != password {
		return nil, false
	}

	role := s.roles[username]
	token := username + "-token"

	return &AuthResult{
		Username: username,
		Role:     role,
		Token:    token,
	}, true
}

func (s *authService) ValidateToken(token string) (string, string, bool) {
	for username, role := range s.roles {
		expected := username + "-token"
		if token == expected {
			return username, role, true
		}
	}

	return "", "", false
}
