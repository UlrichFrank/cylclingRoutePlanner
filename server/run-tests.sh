#!/bin/bash
# Run Jest tests with proper environment for SSL certificate handling
NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_OPTIONS=--experimental-vm-modules npm test "$@"
