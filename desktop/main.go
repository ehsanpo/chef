package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name:        "Chef Game & Watch",
		Description: "Nintendo Game & Watch FP-24 Arcade Game",
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Chef — Nintendo Game & Watch FP-24",
		Width:  900,
		Height: 700,
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
