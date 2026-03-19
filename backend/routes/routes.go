package routes

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"depot-manager/handlers"
	"depot-manager/services"
)

const contextRoleKey = "role"

func NewRouter(authSvc services.AuthService, productSvc services.ProductService, factureSvc services.FactureService, realtimeSvc services.RealtimeService) *gin.Engine {
	router := gin.Default()
	router.Use(corsMiddleware())

	authHandler := handlers.NewAuthHandler(authSvc)
	productHandler := handlers.NewProductHandler(productSvc)
	factureHandler := handlers.NewFactureHandler(factureSvc)
	websocketHandler := handlers.NewWebsocketHandler(authSvc, realtimeSvc)

	router.POST("/login", authHandler.Login)
	router.GET("/products/barcode/:code", productHandler.GetByBarcode)
	router.GET("/products", productHandler.List)
	router.GET("/ws", websocketHandler.Handle)

	authenticated := router.Group("", authMiddleware(authSvc))
	authenticated.POST("/products", roleMiddleware("sales"), productHandler.Create)
	authenticated.POST("/factures", roleMiddleware("sales"), factureHandler.Create)
	authenticated.GET("/factures", roleMiddleware("manager"), factureHandler.List)

	return router
}

func authMiddleware(authSvc services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "missing or invalid token"})
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		_, role, ok := authSvc.ValidateToken(token)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}

		c.Set(contextRoleKey, role)
		c.Next()
	}
}

func roleMiddleware(required string) gin.HandlerFunc {
	return func(c *gin.Context) {
		value, exists := c.Get(contextRoleKey)
		role, ok := value.(string)
		if !exists || !ok || role != required {
			c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Type")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(200)
			return
		}

		c.Next()
	}
}
