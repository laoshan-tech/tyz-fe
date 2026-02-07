# AGENTS.md

This file provides guidelines for agentic coding assistants working on this Vue 3 + TypeScript project.

## Build / Lint / Test Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production (runs type-check + build-only)
npm run preview          # Preview production build
npm run test:unit        # Run all unit tests with Vitest
npm run build-only       # Build without type checking
npm run type-check       # Run TypeScript type checking
```

**Running a single test:**
```bash
npm run test:unit path/to/test.spec.ts
# Or use vitest directly with pattern matching
npm run test:unit -- --run HelloWorld
```

## Code Style & Conventions

### Formatting (Biome)
- **Indent:** 2 spaces
- **Line width:** 120 characters
- **Quotes:** Single quotes
- **Trailing commas:** All
- **Semicolons:** Required
- Run `biome check .` to verify, `biome check --write .` to auto-fix

### Vue Components
- Use Composition API with `<script setup lang="ts">`
- Imports: external libs first, then internal modules with `@/` alias
- Component props: Use `defineProps<Type>()` with TypeScript interfaces
- Template refs: `const refName = ref<ComponentType | null>(null)`
- Use camelCase for props in templates, kebab-case for HTML attributes

### TypeScript
- **Interfaces:** Define in `src/types/index.ts` for shared types
- **Typing:** Avoid `any` - use `unknown` or specific types
- **Exports:** Use named exports, avoid default exports
- **Types:** Use `type` for unions/intersections, `interface` for objects

### Naming Conventions
- **Variables/Functions:** camelCase (`isLoading`, `fetchData`)
- **Components:** PascalCase (`UserProfile`, `DataTable`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Files:** camelCase for utilities, PascalCase for components (`useAuth.ts`, `Login.vue`)

### Imports Organization
1. External libraries (Vue, third-party)
2. Internal modules (using `@/` alias)
3. Relative imports
4. Type imports (use `import type` when possible)

### State Management (Pinia)
- Use setup composition API style
- Define stores as `const useXxxStore = defineStore('xxx', () => { ... })`
- Use `ref` for reactive state, `computed` for derived state
- Return only necessary data/actions, keep internal state private

### Routing (Vue Router)
- Route definitions in `src/router/index.ts`
- Use lazy loading: `component: () => import('@/views/Xxx.vue')`
- Route guards: Use `beforeEach` in router config
- Meta fields: Use for auth (`meta: { public: true }`), titles, etc.

### Error Handling
- Use try/catch for async operations
- Provide user-friendly error messages (Chinese for UI, English for logs)
- Console.error for debugging, avoid console.log in production

### Async/Await
- Prefer async/await over Promise chains
- Handle errors consistently
- Use loading states for UI feedback

### Testing (Vitest)
- Test files: `__tests__/*.spec.ts` or `*.test.ts`
- Use `@vue/test-utils` for component testing
- Environment: jsdom
- Follow AAA pattern: Arrange, Act, Assert

### Component Structure
```vue
<script setup lang="ts">
// 1. Imports
// 2. Props/Emits
// 3. Refs/Reactive state
// 4. Computed properties
// 5. Methods/Functions
// 6. Lifecycle hooks
</script>

<template>
  <!-- Markup -->
</template>

<style scoped>
/* Scoped styles */
</style>
```

### File Structure
- `src/components/` - Reusable UI components
- `src/views/` - Page-level components
- `src/layouts/` - Layout wrappers
- `src/composables/` - Vue composables
- `src/stores/` - Pinia stores
- `src/router/` - Router configuration
- `src/lib/` - Utility libraries (e.g., supabase client)
- `src/types/` - TypeScript type definitions
- `src/assets/` - Static assets
