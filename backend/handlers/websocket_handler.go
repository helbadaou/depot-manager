package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"depot-manager/services"
)

type WebsocketHandler struct {
	authSvc  services.AuthService
	realtime services.RealtimeService
	upgrader websocket.Upgrader
}

func NewWebsocketHandler(authSvc services.AuthService, realtime services.RealtimeService) *WebsocketHandler {
	return &WebsocketHandler{
		authSvc:  authSvc,
		realtime: realtime,
		upgrader: websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }},
	}
}

func (h *WebsocketHandler) Handle(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		header := c.GetHeader("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			token = strings.TrimPrefix(header, "Bearer ")
		}
	}

	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	_, role, ok := h.authSvc.ValidateToken(token)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	if role != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	h.realtime.Register(conn)
	defer func() {
		h.realtime.Unregister(conn)
		conn.Close()
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
