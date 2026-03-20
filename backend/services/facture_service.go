package services

import (
	"errors"
	"sync"
	"time"

	"depot-manager/models"
)

var ErrProductNotFound = errors.New("product not found")

type FactureService interface {
	Create(barcodes []string, items []FactureItemInput) (*models.Facture, error)
	List() []models.Facture
}

type FactureItemInput struct {
	ID       int64
	Name     string
	Price    float64
	Barcode  string
	Quantity int
}

type factureService struct {
	mu         sync.Mutex
	productSvc ProductService
	realtime   RealtimeService
	nextID     int64
	factures   []models.Facture
}

func NewFactureService(productSvc ProductService, realtime RealtimeService) FactureService {
	return &factureService{
		productSvc: productSvc,
		realtime:   realtime,
		nextID:     1,
		factures:   make([]models.Facture, 0),
	}
}

func (s *factureService) Create(barcodes []string, items []FactureItemInput) (*models.Facture, error) {
	products := make([]models.Product, 0, len(barcodes)+len(items))
	var total float64

	if len(items) > 0 {
		for _, it := range items {
			if it.Quantity <= 0 {
				continue
			}
			for i := 0; i < it.Quantity; i++ {
				products = append(products, models.Product{
					ID:      it.ID,
					Name:    it.Name,
					Price:   it.Price,
					Barcode: it.Barcode,
				})
				total += it.Price
			}
		}
	} else {
		for _, code := range barcodes {
			product, ok := s.productSvc.FindByBarcode(code)
			if !ok {
				return nil, ErrProductNotFound
			}
			products = append(products, *product)
			total += product.Price
		}
	}

	facture := models.Facture{
		Products:  products,
		Total:     total,
		CreatedAt: time.Now(),
	}

	s.mu.Lock()
	facture.ID = s.nextID
	s.nextID++
	s.factures = append(s.factures, facture)
	s.mu.Unlock()

	if s.realtime != nil {
		s.realtime.BroadcastFacture(facture)
	}

	return &facture, nil
}

func (s *factureService) List() []models.Facture {
	s.mu.Lock()
	defer s.mu.Unlock()

	out := make([]models.Facture, len(s.factures))
	copy(out, s.factures)
	return out
}
