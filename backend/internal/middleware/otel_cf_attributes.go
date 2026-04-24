package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

func OtelCfAttributes() gin.HandlerFunc {
	return func(c *gin.Context) {
		span := trace.SpanFromContext(c.Request.Context())

		rayID := c.GetHeader("cf-ray")
		if rayID != "" {
			cfRay := strings.Split(rayID, "-")

			span.SetAttributes(attribute.String("cloudflare.ray_id", cfRay[0]))
			span.SetAttributes(attribute.String("cloudflare.colo", cfRay[1]))
		}

		c.Next()
	}
}
