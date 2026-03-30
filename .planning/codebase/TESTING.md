# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Status:** Not configured

**No test infrastructure found:**
- `package.json` contains NO testing dependencies (Jest, Vitest, Mocha, Jasmine not present)
- No `jest.config.ts`, `vitest.config.ts`, or similar test config files
- No test script in `package.json` (only `dev`, `build`, `start`, `lint`)
- No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx` files in `src/` directory
- Zero test files in project source code

**Implication:** Testing must be added before writing tests for this codebase.

## Manual Testing Guidance

Since automated testing is not set up, the CLAUDE.md specification includes manual verification steps:

**Verification Steps (from CLAUDE.md):**
1. `npm run build` passes with no errors
2. Mind Map view renders all nodes and edges
3. Contacts view filters work (All / Employee / Vendor / Service Provider)
4. New Contact modal saves to DB and appears in both views

## Code Organization (if testing were implemented)

### Proposed Test File Structure

**API Routes:** Tests would colocate with route handlers
```
src/app/api/contacts/
  route.ts
  route.test.ts          # Would test GET and POST
  [id]/
    route.ts
    route.test.ts        # Would test PUT and DELETE
```

**Components:** Tests would colocate with components
```
src/components/shared/
  ContactModal.tsx
  ContactModal.test.tsx
src/components/contacts/
  ContactCard.tsx
  ContactCard.test.tsx
```

**Utilities:** Tests would colocate or in parallel `__tests__` directory
```
src/lib/api/
  validation.ts
  validation.test.ts
src/lib/auth/
  session.ts
  session.test.ts
```

## Testing Patterns to Implement

### API Route Testing Pattern

**Recommendation:** Test with MSW (Mock Service Worker) or direct fetch mocking

**Pattern for `src/app/api/contacts/route.ts`:**
```typescript
// Test structure for GET /api/contacts
describe("GET /api/contacts", () => {
  it("should return 401 if not authenticated", () => {
    // Mock unauthenticated request
    // Assert: response.status === 401
  });

  it("should return all contacts for authenticated user", () => {
    // Mock authenticated session
    // Mock Supabase response
    // Assert: response contains contact array
  });

  it("should include contact_companies and contact_projects in response", () => {
    // Verify nested select structure:
    // "*, contact_companies(companies(*)), contact_projects(projects(*))"
  });
});

// Test structure for POST /api/contacts
describe("POST /api/contacts", () => {
  it("should reject invalid contact payload", () => {
    // Missing required fields
    // Assert: response.status === 400
    // Assert: error message indicates which field is required
  });

  it("should insert contact with companyIds and projectIds", () => {
    // Mock: parseContactPayload validates input
    // Mock: Supabase insert operations
    // Assert: contact created
    // Assert: contact_companies join records created
    // Assert: contact_projects join records created
  });
});
```

### Component Testing Pattern

**Recommendation:** Use React Testing Library

**Pattern for `src/components/shared/ContactModal.tsx`:**
```typescript
describe("ContactModal", () => {
  it("should render empty form for new contact", () => {
    render(<ContactModal open={true} onOpenChange={jest.fn()} onSaved={jest.fn()} />);
    // Assert: form fields are empty
    // Assert: "Add Contact" button shown
  });

  it("should populate form when editing existing contact", () => {
    const contact: ContactWithRelations = { /* ... */ };
    render(
      <ContactModal
        open={true}
        contact={contact}
        onOpenChange={jest.fn()}
        onSaved={jest.fn()}
      />
    );
    // Assert: name field contains contact.name
    // Assert: type select shows contact.type
    // Assert: "Save Changes" button shown
  });

  it("should fetch companies and projects on mount", async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ json: async () => [/* companies */] })
      .mockResolvedValueOnce({ json: async () => [/* projects */] });

    global.fetch = mockFetch;
    render(<ContactModal open={true} onOpenChange={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() => {
      // Assert: company checkboxes rendered
      // Assert: project checkboxes rendered
    });
  });

  it("should validate required name field before submit", async () => {
    render(<ContactModal open={true} onOpenChange={jest.fn()} onSaved={jest.fn()} />);
    const submitButton = screen.getByText("Add Contact");
    fireEvent.click(submitButton);

    // Assert: error message "Name is required."
  });
});
```

### Validation Function Testing Pattern

**Pattern for `src/lib/api/validation.ts`:**
```typescript
describe("parseContactPayload", () => {
  it("should parse valid contact payload", () => {
    const payload = {
      name: "John Doe",
      type: "employee",
      email: "john@example.com",
      phone: "+1 555 0000",
      role: "Developer",
      bio: "Senior engineer",
      companyIds: ["comp-1", "comp-2"],
      projectIds: ["proj-1"],
    };

    const result = parseContactPayload(payload);

    expect(result.name).toBe("John Doe");
    expect(result.type).toBe("employee");
    expect(result.email).toBe("john@example.com");
    expect(result.companyIds).toHaveLength(2);
  });

  it("should throw error when name is missing", () => {
    expect(() => parseContactPayload({})).toThrow("Name is required.");
  });

  it("should throw error for invalid contact type", () => {
    expect(() => parseContactPayload({
      name: "John",
      type: "invalid"
    })).toThrow("A valid contact type is required.");
  });

  it("should normalize whitespace in string fields", () => {
    const result = parseContactPayload({
      name: "  John Doe  ",
      type: "employee",
      email: "  john@example.com  ",
    });

    expect(result.name).toBe("John Doe");
    expect(result.email).toBe("john@example.com");
  });

  it("should return empty array for invalid or missing companyIds", () => {
    const result1 = parseContactPayload({ name: "John", type: "employee" });
    const result2 = parseContactPayload({
      name: "John",
      type: "employee",
      companyIds: "not-an-array"
    });

    expect(result1.companyIds).toEqual([]);
    expect(result2.companyIds).toEqual([]);
  });
});
```

### Auth Session Testing Pattern

**Pattern for `src/lib/auth/session.ts`:**
```typescript
describe("resolveSessionFromCookies", () => {
  it("should return null session when no cookies present", async () => {
    const mockStore = { get: jest.fn().mockReturnValue(undefined) };
    const result = await resolveSessionFromCookies(mockStore);

    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
    expect(result.accessToken).toBeNull();
  });

  it("should validate access token and return user", async () => {
    const mockStore = {
      get: jest.fn((name) =>
        name === "cm-access-token"
          ? { value: "valid-token" }
          : undefined
      ),
    };

    // Mock supabase.auth.getUser to return valid user
    jest.mock("@supabase/supabase-js");

    const result = await resolveSessionFromCookies(mockStore);

    expect(result.user).toBeDefined();
    expect(result.accessToken).toBe("valid-token");
  });

  it("should refresh session using refresh token on expired access token", async () => {
    const mockStore = {
      get: jest.fn((name) => {
        if (name === "cm-access-token") return { value: "expired-token" };
        if (name === "cm-refresh-token") return { value: "valid-refresh" };
        return undefined;
      }),
    };

    // Mock: getUser fails (token expired)
    // Mock: refreshSession succeeds with new tokens

    const result = await resolveSessionFromCookies(mockStore);

    expect(result.cookiesChanged).toBe(true);
    expect(result.accessToken).toBe("new-access-token");
  });
});
```

## Testing Gaps

**Critical Areas Without Tests:**
1. **API Route Handlers** (`src/app/api/contacts/route.ts`, etc.)
   - No validation of request authentication
   - No verification of database operations
   - No error handling tests
   - Risk: Database mutations not validated, authorization bypasses possible

2. **Component Logic** (`ContactModal.tsx`, `ContactsGrid.tsx`, etc.)
   - No form submission tests
   - No filter/search functionality tests
   - No modal open/close state management tests
   - Risk: User interactions may break silently, data not saved correctly

3. **Validation Functions** (`src/lib/api/validation.ts`)
   - Normalization logic untested
   - Enum value validation untested
   - Edge cases (null, undefined, wrong types) untested
   - Risk: Invalid data reaches database, inconsistent error messages

4. **Session/Auth** (`src/lib/auth/session.ts`)
   - Cookie resolution untested
   - Token refresh logic untested
   - Authorization check untested
   - Risk: Security vulnerabilities in auth flow

5. **Supabase Integration** (all API routes)
   - Join table operations untested (contact_companies, contact_projects)
   - Query results untested
   - Error conditions untested
   - Risk: Data relationships corrupted, silent failures

6. **Mind Map View** (`src/components/mind-map/*`)
   - No React Flow integration tests
   - No node rendering tests
   - No edge creation tests
   - No layout/positioning tests
   - Risk: Visual bugs go undetected

## Recommended Testing Setup

**Framework:** Vitest (faster, better Next.js support than Jest)
**Component Library:** React Testing Library
**API Testing:** MSW + Vitest
**Type Safety:** TypeScript strict mode already enabled

**Installation Commands:**
```bash
npm install --save-dev vitest @vitest/ui
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev msw
npm install --save-dev @types/jest
```

**Vitest Config** (`vitest.config.ts`):
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Test Script** (update `package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

*Testing analysis: 2026-03-30*

**Status:** No tests implemented. Full testing infrastructure needs to be added.
