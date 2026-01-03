# Integration Troubleshooting Guide

## Common Issues & Solutions

### 1. "Cannot GET /api/cases" or "404 Not Found"

**Problem:** Frontend is trying to connect to the wrong backend URL.

**Solution:**
```typescript
// In src/services/api.ts, check the API_BASE_URL
const API_BASE_URL = 'http://localhost:8000/api';  // ✅ Correct

// Not:
const API_BASE_URL = 'http://localhost:3000/api';  // ❌ Wrong
```

**Steps:**
1. Ensure Django backend is running on `http://localhost:8000`
2. Check CORS_ALLOWED_ORIGINS in backend settings includes your frontend URL
3. Open browser DevTools → Network tab → check request URLs

---

### 2. "401 Unauthorized" or "Authentication failed"

**Problem:** Token is missing or invalid.

**Solution:**
1. Check token is stored in localStorage:
   ```javascript
   // In browser console
   localStorage.getItem('token');  // Should print token
   ```

2. Make sure login was successful:
   - Page should redirect to `/dashboard` after login
   - Check browser console for errors

3. Clear storage and try logging in again:
   ```javascript
   localStorage.clear();
   // Then navigate to /login and login again
   ```

---

### 3. "CORS Error: Access-Control-Allow-Origin missing"

**Problem:** Backend Shuklasn't allow requests from frontend.

**Solution:**
1. Check backend CORS settings:
   ```python
   # In claimchase/settings/base.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://localhost:5173",  # ✅ Make sure this is included
   ]
   ```

2. Restart Django server:
   ```bash
   python manage.py runserver
   ```

3. Hard refresh frontend (Ctrl+Shift+R):
   ```
   Then try API call again
   ```

---

### 4. "Token is invalid or missing" after login

**Problem:** Login succeeded but subsequent requests fail.

**Solution:**
1. Check token is being saved in AuthContext:
   ```typescript
   // src/contexts/AuthContext.tsx
   localStorage.setItem('token', response.data.token);  // Should happen after login
   ```

2. Verify token is being sent with requests:
   ```javascript
   // In browser DevTools → Network tab
   // Click on any API request
   // Check "Authorization" header: Token xyz789token
   ```

3. Make sure interceptor is configured:
   ```typescript
   // In src/services/api.ts
   apiClient.interceptors.request.use((config) => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Token ${token}`;  // ✅ This line is critical
     }
     return config;
   });
   ```

---

### 5. Case creation fails with "400 Bad Request"

**Problem:** Case data format is wrong.

**Solution:**
Check required fields in Drafter.tsx:
```typescript
const formData = {
  insurance_company_name: "",  // ✅ Required (string)
  policy_number: "",           // ✅ Required (string)
  insurance_type: "health",    // ✅ Required (string)
  subject: "",                 // ✅ Required (string)
  description: "",             // ✅ Required (string)
  date_of_incident: "",        // ✅ Required (date string: YYYY-MM-DD)
};
```

Make sure:
1. All required fields are filled
2. `date_of_incident` is in format: `2024-12-20`
3. No extra fields are being sent

---

### 6. "useApi() returns undefined" in Drafter.tsx

**Problem:** useApi hook is not properly exported or imported.

**Solution:**
1. Check import in Drafter.tsx:
   ```typescript
   import { useApi } from "@/hooks/useApi";  // ✅ Correct
   ```

2. Check useCreateCase is exported from useApi.ts:
   ```typescript
   // In src/hooks/useApi.ts
   export const useCreateCase = () => { ... }  // ✅ Should be exported
   ```

3. Use directly instead of through useApi():
   ```typescript
   // Better approach:
   import { useCreateCase } from "@/hooks/useApi";
   
   export default function Drafter() {
     const createCaseMutation = useCreateCase();
     // ... rest of code
   }
   ```

---

### 7. Login form Shuklasn't respond when typing

**Problem:** Form might be disabled during loading.

**Solution:**
Check that loading state is managed:
```typescript
// In Login.tsx
disabled={isLoading}  // Should be checked
```

If inputs are still disabled:
1. Check AuthContext.login() is returning properly
2. Make sure isLoading state is being set to false after response

---

### 8. "Cannot read property 'login' of undefined" in useAuth()

**Problem:** AuthContext provider is missing or not wrapping the app.

**Solution:**
1. Check AuthContext is provided in App.tsx or main layout:
   ```typescript
   // In App.tsx or appropriate wrapper
   <AuthProvider>
     <YourRoutes />
   </AuthProvider>
   ```

2. Verify AuthContext export:
   ```typescript
   // In src/contexts/AuthContext.tsx
   export const AuthProvider = ({ children }) => { ... }
   export const useAuth = () => { ... }
   ```

---

### 9. Browser console shows "useApi is not a function"

**Problem:** useApi function Shuklasn't exist or isn't exported properly.

**Solution:**
The issue in Drafter.tsx where we use `useApi().mutations.useCreateCase?.()` is fragile.

**Better Fix:**
```typescript
// Instead of this (in Drafter.tsx):
const createCaseMutation = useApi().mutations.useCreateCase?.();

// Do this:
import { useCreateCase } from "@/hooks/useApi";

export default function Drafter() {
  const createCaseMutation = useCreateCase();
  // ... rest
}
```

---

### 10. "React Query cache not invalidating"

**Problem:** After creating a case, the cases list Shuklasn't update.

**Solution:**
Make sure useCreateCase mutation has cache invalidation:
```typescript
// In src/hooks/useApi.ts
export const useCreateCase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => caseAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });  // ✅ Important
    },
  });
};
```

If still not working:
1. Check React Query DevTools (install @tanstack/react-query-devtools)
2. Manually trigger refetch: `refetch()` from useQuery hook

---

## Debugging Tools

### 1. Browser DevTools → Network Tab
- Monitor all API requests
- Check response status, headers, body
- Verify token is in Authorization header

### 2. React DevTools
- Check component props and state
- Verify useAuth() is returning correct values
- Check query cache state

### 3. Django Admin Panel
- http://localhost:8000/admin
- Verify cases are created in database
- Check user records

### 4. API Swagger Documentation
- http://localhost:8000/api/docs/
- Test all endpoints directly
- See request/response examples

### 5. Browser Console
```javascript
// Check stored token
localStorage.getItem('token');

// Check AuthContext value
// (requires adding custom debugging in AuthContext)

// Check API responses
fetch('http://localhost:8000/api/cases/', {
  headers: { 'Authorization': `Token YOUR_TOKEN` }
}).then(r => r.json()).then(console.log);
```

---

## Quick Verification Checklist

Before reporting issues, verify:

- [ ] Django backend is running (`python manage.py runserver`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Backend is accessible at http://localhost:8000
- [ ] Frontend is accessible at http://localhost:5173
- [ ] CORS_ALLOWED_ORIGINS includes frontend URL
- [ ] AuthContext is imported in App.tsx
- [ ] useAuth() hook works in Login.tsx
- [ ] Token is stored in localStorage after login
- [ ] useCreateCase() hook is imported in Drafter.tsx
- [ ] caseAPI.create() method exists in api.ts

---

## Still Having Issues?

1. **Check the logs:**
   ```bash
   # Backend
   Terminal running Django should show errors
   
   # Frontend
   Browser DevTools → Console tab shows errors
   ```

2. **Clear cache:**
   ```bash
   # Frontend
   - Delete node_modules and pnpm-lock.yaml
   - Run: pnpm install
   - Run: npm run dev
   
   # Backend
   - Run: python manage.py migrate
   - Restart: python manage.py runserver
   ```

3. **Verify database:**
   ```bash
   # Check migrations applied
   python manage.py showmigrations
   
   # Check users exist
   python manage.py shell
   >>> from claimchase.apps.users.models import CustomUser
   >>> CustomUser.objects.all()
   ```

4. **Test API directly:**
   ```bash
   # Login
   curl -X POST http://localhost:8000/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"email":"user@gmail.com","password":"pass123"}'
   
   # Create case (with token from login)
   curl -X POST http://localhost:8000/api/cases/ \
     -H "Authorization: Token YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "insurance_company_name":"Aetna",
       "policy_number":"POL123",
       "insurance_type":"health",
       "subject":"Test",
       "description":"Test case",
       "date_of_incident":"2024-12-20"
     }'
   ```

---

## Performance Tips

1. **React Query Cache:**
   - Cases are cached for 5 minutes
   - Timeline for 2 minutes
   - Adjust staleTime in useApi.ts if needed

2. **Network Optimization:**
   - Use pagination for case lists
   - Lazy load case details
   - Bundle analyze: `npm run build -- --analyze`

3. **Component Optimization:**
   - Use React.memo for list items
   - Avoid unnecessary re-renders
   - Use useCallback for event handlers

---

## Production Deployment

When deploying to production:

1. **Update API_BASE_URL:**
   ```typescript
   // In src/services/api.ts
   const API_BASE_URL = 'https://your-backend-domain.com/api';
   ```

2. **Update CORS_ALLOWED_ORIGINS:**
   ```python
   # In claimchase/settings/prod.py
   CORS_ALLOWED_ORIGINS = [
     "https://your-frontend-domain.com",
   ]
   ```

3. **Enable HTTPS:**
   ```python
   # In claimchase/settings/prod.py
   SECURE_SSL_REDIRECT = True
   SESSION_COOKIE_SECURE = True
   CSRF_COOKIE_SECURE = True
   ```

4. **Update Secret Key and allowed hosts:**
   ```python
   ALLOWED_HOSTS = ['your-backend-domain.com']
   SECRET_KEY = os.getenv('SECRET_KEY')  # Use environment variable
   ```
