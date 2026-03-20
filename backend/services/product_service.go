package services

import (
	"database/sql"
	"errors"
	"sync"

	"github.com/mattn/go-sqlite3"

	"depot-manager/models"
)

var (
	ErrProductExists  = errors.New("product already exists")
	ErrInvalidProduct = errors.New("invalid product")
)

type ProductService interface {
	FindByBarcode(code string) (*models.Product, bool)
	Create(p models.Product) (*models.Product, error)
	List() ([]models.Product, error)
}

type productService struct {
	db *sql.DB
	mu sync.Mutex
}

func InitProductStore(db *sql.DB) error {
	createTable := `CREATE TABLE IF NOT EXISTS products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		price REAL NOT NULL,
		barcode TEXT UNIQUE NOT NULL
	);`
	if _, err := db.Exec(createTable); err != nil {
		return err
	}

	return nil
}

func NewProductService(db *sql.DB) ProductService {
	return &productService{db: db}
}

func (s *productService) FindByBarcode(code string) (*models.Product, bool) {
	row := s.db.QueryRow("SELECT id, name, price, barcode FROM products WHERE barcode = ?", code)
	var p models.Product
	if err := row.Scan(&p.ID, &p.Name, &p.Price, &p.Barcode); err != nil {
		return nil, false
	}
	return &p, true
}

func (s *productService) Create(p models.Product) (*models.Product, error) {
	if p.Barcode == "" || p.Name == "" || p.Price <= 0 {
		return nil, ErrInvalidProduct
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	res, err := s.db.Exec("INSERT INTO products(name, price, barcode) VALUES(?,?,?)", p.Name, p.Price, p.Barcode)
	if err != nil {
		if sqlErr, ok := err.(sqlite3.Error); ok && sqlErr.ExtendedCode == sqlite3.ErrConstraintUnique {
			return nil, ErrProductExists
		}
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	p.ID = id
	return &p, nil
}

func (s *productService) List() ([]models.Product, error) {
	rows, err := s.db.Query("SELECT id, name, price, barcode FROM products ORDER BY id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Barcode); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}
