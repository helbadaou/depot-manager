package models

import "time"

type Facture struct {
	ID        int64     `json:"id"`
	Products  []Product `json:"products"`
	Total     float64   `json:"total"`
	CreatedAt time.Time `json:"created_at"`
}
