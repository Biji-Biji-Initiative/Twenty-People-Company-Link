# Twenty People Company Link

Automation toolset for linking people records to company records in Twenty CRM based on email domain matching.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
TWENTY_SERVER_URL=http://localhost:3000
TWENTY_API_KEY=your-api-key-here

# 3. Populate company domains
node populate_company_domain_text.mjs

# 4. Link all people
node link_all_people_in_batches.mjs
```

## 📚 Documentation

**All documentation is located in the [`docs/`](./docs/) folder:**

- **[📖 Complete Documentation](./docs/README.md)** - Full comprehensive guide
- **[⚡ Quick Start Guide](./docs/QUICK_START.md)** - Get started in 5 minutes
- **[🔗 Link Script Guide](./docs/README_LINK_SCRIPT.md)** - Detailed linking script documentation
- **[🔌 Endpoint Implementation](./docs/ENDPOINT_IMPLEMENTATION.md)** - API endpoint specification
- **[📑 Documentation Index](./docs/INDEX.md)** - Documentation overview

## ✨ Features

- **Batch Processing** - Handles large datasets efficiently
- **Progress Tracking** - Auto-resume functionality
- **Domain Normalization** - Handles various domain formats
- **Error Handling** - Comprehensive error tracking
- **GraphQL Integration** - Direct Twenty CRM API integration

## 📋 Scripts

### Main Scripts
- `link_all_people_in_batches.mjs` - Main linking script
- `populate_company_domain_text.mjs` - Populate company domain fields

### Utility Scripts
- `find_all_people_with_domains.mjs` - Analyze people domain status
- `find_missing_people.mjs` - Find missing people
- `link_btn_people.mjs` - Link specific domain
- `setup_btn_company.mjs` - Setup company
- `test_btn_linking.mjs` - Test linking
- `debug_btn_company.mjs` - Debug company
- `list_companies_and_people.mjs` - List all data

## 🔧 Configuration

Create a `.env` file:

```env
TWENTY_SERVER_URL=http://localhost:3000
TWENTY_API_KEY=your-api-key-here
PAGE_SIZE=500
CONCURRENCY=3
DELAY_MS=2000
```

## 📖 Usage

See the [Complete Documentation](./docs/README.md) for:
- Detailed installation instructions
- Configuration options
- Script reference
- Workflow guides
- Troubleshooting
- Best practices

## 🆘 Support

- Check [Troubleshooting](./docs/README.md#troubleshooting) section
- Review [Best Practices](./docs/README.md#best-practices)
- Use utility scripts for debugging

## 📝 License

This project is provided as-is for use with Twenty CRM.

---

**Version**: 1.0.0  
**Last Updated**: 2024
