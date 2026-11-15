package main

import (
	"flag"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

func main() {
	secret := flag.String("secret", "secret", "JWT secret")
	id := flag.String("id", "63a6f1d0fac31c9e88000000", "User ID")
	flag.Parse()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":  *id,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(*secret))
	if err != nil {
		panic(err)
	}

	fmt.Println(tokenString)
}
