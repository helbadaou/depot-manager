package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"

	"depot-manager/routes"
	"depot-manager/services"
)

func main() {
	dbPath := envOrDefault("DB_PATH", "./pos.db")
	port := envOrDefault("PORT", "8080")

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := services.InitProductStore(db); err != nil {
		log.Fatal(err)
	}

	authSvc := services.NewAuthService()
	productSvc := services.NewProductService(db)
	realtimeSvc := services.NewRealtimeService()
	factureSvc := services.NewFactureService(productSvc, realtimeSvc)

	router := routes.NewRouter(authSvc, productSvc, factureSvc, realtimeSvc)

	log.Fatal(router.Run(":" + port))
}

func envOrDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
