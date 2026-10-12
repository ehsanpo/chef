package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend
var assets embed.FS

//go:embed appicon.png
var appIcon []byte

func main() {
	app := application.New(application.Options{
		Name:        "Chef Game",
		Description: "FP-24 Arcade Game",
		Icon:        appIcon,
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:               "Chef",
		Width:               900,
		Height:              715,
		DisableResize:       true,
		MaximiseButtonState: application.ButtonDisabled,
		MinWidth:            900,
		MinHeight:           715,
		MaxWidth:            900,
		MaxHeight:           715,
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
