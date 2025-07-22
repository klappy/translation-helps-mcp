# Incident Response Runbook - Translation Helps API

## 🚨 Emergency Contacts

- **Primary On-Call**: Translation Platform Team
- **Secondary**: Infrastructure Team  
- **Escalation**: Platform Lead
- **External**: unfoldingWord Support

## 📋 Incident Severity Levels

### P0 - Critical (< 15 min response)
- Complete API outage
- Data corruption or loss
- Security breach
- >50% error rate for >5 minutes

### P1 - High (< 1 hour response)  
- Partial API outage
- Performance degradation >2x baseline
- DCS dependency failure
- 10-50% error rate

### P2 - Medium (< 4 hours response)
- Single endpoint issues
- Cache failures
- Monitoring/alerting issues
- <10% error rate

### P3 - Low (< 24 hours response)
- Documentation issues
- Minor performance issues
- Non-critical feature failures

## 🔧 Common Incidents & Procedures

### API Completely Down

**Symptoms:**
- Health check endpoint returns 5xx errors
- All API endpoints unresponsive
- Prometheus alert: `TranslationAPIDown`

**Immediate Actions:**
1. Check Cloudflare Pages status dashboard
2. Verify latest deployment status in GitHub Actions
3. Check for ongoing Cloudflare incidents
4. Review recent changes in the last 2 hours

**Investigation Steps:**
```bash
# Check health endpoint
curl -v https://translation-helps-mcp.pages.dev/api/health

# Check deployment status
gh workflow view "Production Deployment Pipeline" --repo unfoldingword/translation-helps-mcp

# Check Cloudflare Pages logs
wrangler pages deployment list --project-name=translation-helps-mcp

# Check error rates in the last hour
# (Use Grafana dashboard or Cloudflare Analytics)
```

**Resolution:**
1. If deployment issue: Rollback via Cloudflare Pages dashboard
2. If Cloudflare issue: Wait for upstream resolution, communicate status
3. If code issue: Emergency hotfix deployment
4. Update incident status and communicate to stakeholders

### High Response Times

**Symptoms:**
- P95 response times >500ms for scripture endpoints
- P95 response times >800ms for translation helps
- Prometheus alert: `TranslationAPISlowResponse`

**Investigation:**
1. Check DCS API response times
2. Verify cache hit ratios
3. Look for unusual traffic patterns
4. Check resource utilization

**Resolution Steps:**
```bash
# Check DCS API status
curl -w "@curl-format.txt" https://git.door43.org/api/v1/repos

# Test cache performance
curl -H "Cache-Control: no-cache" https://translation-helps-mcp.pages.dev/api/health

# Check for traffic spikes
# (Use Cloudflare Analytics dashboard)
```

**Common Causes & Fixes:**
- **DCS API slow**: Implement circuit breaker, increase timeouts
- **Cache miss spike**: Trigger manual cache warming
- **Traffic spike**: Review rate limiting, contact Cloudflare if needed
- **Code regression**: Identify and rollback problematic deployment

### High Error Rate

**Symptoms:**
- >5% of requests returning 5xx errors
- Specific endpoints consistently failing
- Prometheus alert: `TranslationAPIHighErrorRate`

**Investigation Priority:**
1. Identify which endpoints are failing
2. Check error logs for patterns
3. Verify DCS API health
4. Review recent deployments

**Resolution:**
```bash
# Get error breakdown by endpoint
# (Use monitoring dashboard)

# Test specific failing endpoints
curl -v https://translation-helps-mcp.pages.dev/api/fetch-scripture?reference=John3:16

# Check DCS connectivity
curl https://git.door43.org/api/v1/repos/unfoldingWord/en_ult

# Review recent deployments for correlation
gh run list --repo unfoldingword/translation-helps-mcp --limit 10
```

### DCS API Unavailable

**Symptoms:**
- Cannot fetch scripture or translation resources
- DCS health checks failing
- Prometheus alert: `DCSUnavailable`

**Impact Assessment:**
- Cached content continues to work
- New requests for uncached content fail
- Translation tools dependent on fresh data affected

**Resolution:**
1. Verify DCS status at git.door43.org
2. Check if issue is network connectivity or DCS-side
3. Implement graceful degradation if extended outage
4. Communicate impact to users

**Graceful Degradation:**
```bash
# Enable extended cache TTLs temporarily
# (Would require code change or feature flag)

# Switch to backup content source if available
# (Future enhancement)

# Provide cached-only mode messaging
```

### Cache Performance Issues

**Symptoms:**
- Cache hit ratio <70%
- Increased response times
- High DCS API request volume

**Investigation:**
```bash
# Check cache statistics
# (Via monitoring dashboard)

# Test cache behavior
curl -I https://translation-helps-mcp.pages.dev/api/fetch-scripture?reference=John3:16
# Look for cache headers

# Verify cache warming is working
# (Check logs or monitoring)
```

**Resolution:**
1. Trigger manual cache warming for popular resources
2. Investigate cache invalidation patterns
3. Review cache key generation for conflicts
4. Adjust cache TTLs if needed

## 🔄 Rollback Procedures

### Cloudflare Pages Rollback

1. Go to Cloudflare Pages dashboard
2. Select `translation-helps-mcp` project
3. Navigate to "Deployments" tab
4. Find the last known good deployment
5. Click "..." → "Rollback to this deployment"
6. Confirm rollback
7. Wait 2-3 minutes for propagation
8. Verify health check passes

### Emergency Code Rollback

If dashboard rollback isn't available:

```bash
# Revert the problematic commit
git revert <commit-hash>

# Push to trigger new deployment
git push origin main

# Monitor deployment progress
gh workflow view "Production Deployment Pipeline"
```

## 📊 Monitoring & Diagnostics

### Key Dashboards
- **Grafana Main**: https://grafana.translation.tools/d/translation-api
- **Cloudflare Analytics**: Pages project analytics
- **GitHub Actions**: Deployment pipeline status

### Key Metrics to Monitor
- Response times (P50, P95, P99)
- Error rates by endpoint
- Cache hit ratios
- DCS API response times
- Request volume and patterns

### Log Locations
- **Application Logs**: Cloudflare Pages Functions logs
- **Access Logs**: Cloudflare Analytics
- **Deployment Logs**: GitHub Actions workflow runs
- **Monitoring Logs**: Prometheus/Grafana

## 📞 Communication Templates

### Internal Incident Update
```
INCIDENT UPDATE - Translation Helps API

Status: [INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED]
Severity: [P0/P1/P2/P3]
Started: [TIMESTAMP]
Impact: [DESCRIPTION]
Current Status: [DESCRIPTION]
Next Update: [TIMESTAMP]
Incident Commander: [NAME]
```

### User-Facing Status Update
```
We are currently experiencing issues with the Translation Helps API that may affect [SPECIFIC FUNCTIONALITY]. 

Our team is actively working to resolve this issue. We will provide updates every [TIMEFRAME] until resolved.

For real-time updates, please check our status page at [STATUS_PAGE_URL].

Thank you for your patience.
```

## 🧪 Post-Incident Actions

1. **Document the incident** in incident tracking system
2. **Conduct blameless post-mortem** within 48 hours
3. **Identify root cause** and contributing factors  
4. **Create action items** to prevent recurrence
5. **Update runbooks** based on lessons learned
6. **Share learnings** with the team

### Post-Mortem Template
- **Incident Summary**
- **Timeline of Events**
- **Root Cause Analysis**
- **Impact Assessment**
- **What Went Well**
- **What Could Be Improved**
- **Action Items** (with owners and due dates)

## 🔗 Related Documentation

- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Architecture Guide](../ARCHITECTURE_GUIDE.md)
- [Debugging Guide](../DEBUGGING_GUIDE.md)
- [Security Runbook](./security-response.md)
- [Performance Runbook](./performance-optimization.md)

---

**Last Updated**: January 2025  
**Review Schedule**: Monthly  
**Owner**: Platform Team
