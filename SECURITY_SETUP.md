# Security Setup Guide

This document outlines the security configuration for the Risk Management System.

## Overview

The system implements a multi-layered security approach:

1. **Database Security**: Row Level Security (RLS) with Supabase
2. **API Security**: JWT authentication and rate limiting
3. **Network Security**: HTTPS, CORS, and reverse proxy
4. **Application Security**: Input validation and sanitization

## Database Security (Supabase)

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Example: Portfolios table policy
CREATE POLICY "Users can view their own portfolios"
ON portfolios FOR SELECT
USING (auth.uid() = user_id);
```

### Service Role vs Anon Key

- **Anon Key**: Used by frontend clients, limited by RLS policies
- **Service Role Key**: Used by backend services, bypasses RLS (use carefully)

### Environment Variables

```bash
# Frontend (uses anon key)
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend (uses service role key)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## API Security

### JWT Authentication

The Risk Engine validates JWT tokens from Supabase:

```python
# In risk_engine/services/auth.py
def verify_jwt(token: str) -> Dict[str, Any]:
    payload = jwt.decode(
        token,
        JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_exp": True}
    )
    return payload
```

### Rate Limiting

Nginx configuration includes rate limiting:

```nginx
# API calls: 10 requests per second
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Calculations: 2 requests per second (more expensive)
limit_req_zone $binary_remote_addr zone=calc:10m rate=2r/s;
```

### CORS Configuration

Properly configured CORS headers:

```nginx
add_header Access-Control-Allow-Origin *;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept";
```

## Network Security

### HTTPS Configuration

For production, configure SSL/TLS certificates:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
}
```

### Security Headers

Essential security headers are configured:

```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy strict-origin-when-cross-origin;
```

## Application Security

### Input Validation

All API endpoints use Pydantic models for validation:

```python
class CalcRequest(BaseModel):
    portfolio_id: str
    confidence: float = Field(ge=0.01, le=0.999)
    horizon_days: int = Field(ge=1, le=252)
    n_sim: int = Field(ge=10000, le=500000)
```

### SQL Injection Prevention

Using Supabase client with parameterized queries:

```python
# Safe - uses parameterized query
response = supabase.table("portfolios").select("*").eq("id", portfolio_id).execute()

# Never do this - vulnerable to injection
# query = f"SELECT * FROM portfolios WHERE id = '{portfolio_id}'"
```

### Environment Variable Security

Sensitive configuration is stored in environment variables:

```bash
# Production secrets (never commit these)
SUPABASE_SERVICE_ROLE_KEY=sbp_xxx...
SUPABASE_JWT_SECRET=xxx...
TIINGO_API_KEY=xxx...

# Public configuration (safe to expose)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Deployment Security

### Docker Security

Non-root user in containers:

```dockerfile
# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app
```

### Secrets Management

For production deployments:

1. **Railway**: Use environment variables in dashboard
2. **Google Cloud**: Use Secret Manager
3. **AWS**: Use Systems Manager Parameter Store
4. **Azure**: Use Key Vault

### Health Checks

Secure health check endpoints:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
```

## Monitoring and Logging

### Security Monitoring

Configure monitoring for:

- Failed authentication attempts
- Rate limit violations
- Unusual API usage patterns
- Database connection failures

### Logging Best Practices

```python
# Log security events
logger.warning(f"Failed authentication attempt from {request.client.host}")

# Never log sensitive data
logger.info(f"User {user_id} calculated VaR")  # Good
# logger.info(f"JWT token: {token}")  # BAD - never log tokens
```

## Security Checklist

### Pre-Production

- [ ] All environment variables configured
- [ ] RLS policies tested
- [ ] Rate limiting configured
- [ ] HTTPS certificates installed
- [ ] Security headers configured
- [ ] Input validation implemented
- [ ] Error handling doesn't leak sensitive info

### Production

- [ ] Monitor authentication failures
- [ ] Regular security updates
- [ ] Backup and recovery tested
- [ ] Access logs reviewed
- [ ] Performance monitoring active

### Ongoing

- [ ] Regular dependency updates
- [ ] Security audit quarterly
- [ ] Penetration testing annually
- [ ] Incident response plan updated

## Common Security Issues to Avoid

### 1. Exposed Secrets

```bash
# BAD - committing secrets to git
SUPABASE_SERVICE_ROLE_KEY=sbp_real_key_here

# GOOD - using placeholder
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Insufficient Input Validation

```python
# BAD - no validation
def calculate_var(simulations: int):
    # Could crash with negative numbers
    return np.random.normal(0, 1, simulations)

# GOOD - proper validation
def calculate_var(simulations: int = Field(ge=1000, le=1000000)):
    return np.random.normal(0, 1, simulations)
```

### 3. Overprivileged Database Access

```python
# BAD - using service role key in frontend
const supabase = createClient(url, SERVICE_ROLE_KEY)

# GOOD - using anon key with RLS
const supabase = createClient(url, ANON_KEY)
```

### 4. Missing Rate Limiting

```nginx
# BAD - no rate limiting
location /api/calc/ {
    proxy_pass http://backend;
}

# GOOD - with rate limiting
location /api/calc/ {
    limit_req zone=calc burst=5 nodelay;
    proxy_pass http://backend;
}
```

## Emergency Response

### Suspected Security Breach

1. **Immediate Actions**:
   - Rotate all API keys and secrets
   - Review access logs
   - Disable affected user accounts
   - Scale down services if needed

2. **Investigation**:
   - Collect logs and evidence
   - Identify scope of breach
   - Document timeline of events

3. **Recovery**:
   - Apply security patches
   - Update security policies
   - Notify affected users
   - Conduct post-incident review

### Contact Information

- **Security Team**: security@yourcompany.com
- **On-Call Engineer**: +1-xxx-xxx-xxxx
- **Incident Management**: incidents@yourcompany.com



