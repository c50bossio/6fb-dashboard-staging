# Page snapshot

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- main:
  - text: 6FB
  - heading "Sign in to your barbershop" [level=2]
  - paragraph:
    - text: Or
    - link "create a new account":
      - /url: /register
  - text: Email address
  - textbox "Email address"
  - text: Password
  - textbox "Password"
  - button
  - checkbox "Remember me"
  - text: Remember me
  - link "Forgot your password?":
    - /url: /forgot-password
  - button "Sign in"
  - text: Or continue with
  - button "Sign in with Google":
    - img
    - text: Sign in with Google
  - text: Development Only
  - button "🚧 Dev Bypass Login (localhost only)"
  - paragraph: "Demo credentials for testing:"
  - paragraph: "Email: demo@barbershop.com Password: demo123"
  - link "← Back to home page":
    - /url: /
- alert
```