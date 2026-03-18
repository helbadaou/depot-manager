package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"depot-manager/models"
	"depot-manager/services"
)

type ProductHandler struct {
	productSvc services.ProductService
}

func NewProductHandler(productSvc services.ProductService) *ProductHandler {
	return &ProductHandler{productSvc: productSvc}
}

type CreateProductRequest struct {
	Name    string  `json:"name"`
	Price   float64 `json:"price"`
	Barcode string  `json:"barcode"`
}

func (h *ProductHandler) GetByBarcode(c *gin.Context) {
	code := c.Param("code")
	product, found := h.productSvc.FindByBarcode(code)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) List(c *gin.Context) {
	products, err := h.productSvc.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list products"})
		return
	}

	c.JSON(http.StatusOK, products)
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	product, err := h.productSvc.Create(models.Product{Name: req.Name, Price: req.Price, Barcode: req.Barcode})
	if err != nil {
		switch err {
		case services.ErrInvalidProduct:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid product"})
			return
		case services.ErrProductExists:
			c.JSON(http.StatusConflict, gin.H{"error": "barcode already exists"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create product"})
			return
		}
	}

	c.JSON(http.StatusCreated, product)
}
