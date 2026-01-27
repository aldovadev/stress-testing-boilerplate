# K6 Testing Framework

A performance and load testing framework built with k6.

## Overview

This project provides a structured framework for performance testing, load testing, and API validation using k6.

## Getting Started

### Prerequisites

- k6 installed ([Installation guide](https://k6.io/docs/getting-started/installation/))
- Node.js (optional, for dependencies)

### Installation

1. Clone the repository
2. Set up environment variables:
   ```bash
   cp .env.example env/.env
   ```
3. Install dependencies (if applicable)

## Project Structure

```
/
├── env/              # Environment configuration files
├── tests/            # Test scripts
├── lib/              # Reusable test libraries
└── README.md         # This file
```

## Running Tests

```bash
# Run all tests
k6 run tests/script.js

# Run with specific environment
k6 run --env ENV=staging tests/script.js

# Run with load simulation
k6 run -u 100 -d 30s tests/script.js
```

## Configuration

Environment-specific configurations are stored in `env/` directory. Add your `.env` files here (excluded from git).

## License

MIT
