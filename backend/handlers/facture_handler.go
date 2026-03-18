package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"depot-manager/services"
)

type FactureHandler struct {
	factureSvc services.FactureService
}

type CreateFactureRequest struct {
	Barcodes []string      `json:"barcodes"`
	Items    []ItemRequest `json:"items"`
}

type ItemRequest struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Barcode  string  `json:"barcode"`
	Quantity int     `json:"quantity"`
}

type CreateFactureResponse struct {
	ID int64 `json:"id"`
}

func NewFactureHandler(factureSvc services.FactureService) *FactureHandler {
	return &FactureHandler{factureSvc: factureSvc}
}

func (h *FactureHandler) Create(c *gin.Context) {
	var req CreateFactureRequest
	if err := c.ShouldBindJSON(&req); err != nil || (len(req.Barcodes) == 0 && len(req.Items) == 0) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "barcodes or items required"})
		return
	}

	inputs := make([]services.FactureItemInput, 0, len(req.Items))
	for _, it := range req.Items {
		inputs = append(inputs, services.FactureItemInput{
			ID:       it.ID,
			Name:     it.Name,
			Price:    it.Price,
			Barcode:  it.Barcode,
			Quantity: it.Quantity,
		})
	}

	facture, err := h.factureSvc.Create(req.Barcodes, inputs)
	if err != nil {
		if err == services.ErrProductNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "one or more barcodes not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create facture"})
		return
	}

	c.JSON(http.StatusCreated, facture)
}

func (h *FactureHandler) List(c *gin.Context) {
	factures := h.factureSvc.List()
	c.JSON(http.StatusOK, factures)
}
