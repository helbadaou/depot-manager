package services

import (
	"sync"

	"github.com/gorilla/websocket"

	"depot-manager/models"
)

// RealtimeService keeps track of manager websocket connections and broadcasts factures.
type RealtimeService interface {
	Register(conn *websocket.Conn)
	Unregister(conn *websocket.Conn)
	BroadcastFacture(facture models.Facture)
}

type realtimeService struct {
	mu    sync.Mutex
	conns map[*websocket.Conn]struct{}
}

func NewRealtimeService() RealtimeService {
	return &realtimeService{conns: make(map[*websocket.Conn]struct{})}
}

func (s *realtimeService) Register(conn *websocket.Conn) {
	s.mu.Lock()
	s.conns[conn] = struct{}{}
	s.mu.Unlock()
}

func (s *realtimeService) Unregister(conn *websocket.Conn) {
	s.mu.Lock()
	delete(s.conns, conn)
	s.mu.Unlock()
}

func (s *realtimeService) BroadcastFacture(facture models.Facture) {
	s.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(s.conns))
	for c := range s.conns {
		conns = append(conns, c)
	}
	s.mu.Unlock()

	for _, conn := range conns {
		if err := conn.WriteJSON(facture); err != nil {
			conn.Close()
			s.Unregister(conn)
		}
	}
}
