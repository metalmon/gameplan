# Gameplan Configuration Guide

This guide covers various configuration options available in Gameplan.

## Unsplash Integration

Gameplan uses Unsplash API to provide beautiful cover images for spaces, profiles, and pages. To enable this feature:

1. Create a developer account at [Unsplash Developers](https://unsplash.com/developers)
2. Create a new application to get your API access key
3. Add the access key to your site configuration:
    ```sh
    # For Docker setup
    docker-compose exec backend bench --site test.localhost set-config unsplash_access_key "your_access_key"

    # For Local setup
    bench --site gameplan.test set-config unsplash_access_key "your_access_key"
    ```
4. Restart your Frappe server to apply the changes:
    ```sh
    # For Docker setup
    docker-compose restart backend

    # For Local setup
    bench restart
    ```
