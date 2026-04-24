package main

import (
	"fmt"
	"os"
	"runtime"
	_ "time/tzdata"

	"github.com/grafana/pyroscope-go"
	"github.com/pocket-id/pocket-id/backend/internal/cmds"
	"github.com/pocket-id/pocket-id/backend/internal/common"
	"github.com/sirupsen/logrus"
)

// @title Pocket ID API
// @version 1.0
// @description.markdown

func main() {
	runtime.SetMutexProfileFraction(5)
	runtime.SetBlockProfileRate(5)

	pyroscopeLogger := logrus.New()
	pyroscopeLogger.SetLevel(logrus.InfoLevel)

	_, err := pyroscope.Start(pyroscope.Config{
		ApplicationName: common.Name,

		ServerAddress: "http://host.containers.internal:4040",

		Logger: pyroscopeLogger,

		ProfileTypes: []pyroscope.ProfileType{
			// these profile types are optional:
			pyroscope.ProfileGoroutines,
			pyroscope.ProfileMutexCount,
			pyroscope.ProfileMutexDuration,
			pyroscope.ProfileBlockCount,
			pyroscope.ProfileBlockDuration,
		},
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "pyroscope error: %v\n", err)
		os.Exit(1)
	}

	if err := common.ValidateEnvConfig(&common.EnvConfig); err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	cmds.Execute()
}
