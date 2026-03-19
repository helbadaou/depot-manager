package main

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"

	"depot-manager/routes"
	"depot-manager/services"
)

func main() {
	db, err := sql.Open("sqlite3", "./pos.db?_foreign_keys=on")
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

	log.Fatal(router.Run(":8080"))
}
