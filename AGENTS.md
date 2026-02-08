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
- **Organize imports:** Enabled (auto-sorts imports)
- Run `biome check .` to verify, `biome check --write .` to auto-fix

### Vue Components
- Use Composition API with `<script setup lang="ts">`
- Imports: external libs first, then internal modules with `@/` alias
- Component props: Use `defineProps<Type>()` with TypeScript interfaces
- Template refs: `const refName = ref<ComponentType | null>(null)`
- Use camelCase for props in templates, kebab-case for HTML attributes
- Use TDesign components (e.g., `t-button`, `t-form`, `t-input`)

### TypeScript
- **Interfaces:** Define in `src/types/index.ts` for shared types
- **Typing:** Avoid `any` - use `unknown` or specific types (Biome allows `any` in some cases)
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

**Example:**
```typescript
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { useAuth } from '@/composables/useAuth';
import type { FormRules } from 'tdesign-vue-next';
```

### State Management (Pinia)
- Use setup composition API style
- Define stores as `const useXxxStore = defineStore('xxx', () => { ... })`
- Use `ref` for reactive state, `computed` for derived state
- Return only necessary data/actions, keep internal state private

### Composables
- Use module-level state for singleton pattern (shared across components)
- Return `readonly()` refs to prevent external mutations
- Export function with `export function useXxx()`
- Handle cleanup in `onUnmounted` if needed

### Routing (Vue Router)
- Route definitions in `src/router/index.ts`
- Use lazy loading: `component: () => import('@/views/Xxx.vue')`
- Route guards: Use `beforeEach` in router config
- Meta fields: Use for auth (`meta: { public: true }`), titles, etc.

### Error Handling
- Use try/catch for async operations
- Provide user-friendly error messages (Chinese for UI, English for logs)
- Use `MessagePlugin.error()` from TDesign for user notifications
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

### TDesign UI Guidelines
- Use Chinese for labels, placeholders, and messages
- Use `theme="primary"` for primary actions
- Use `variant="text"` for secondary/icon buttons
- Use `size="small"` for table action buttons
- Use `MessagePlugin` for toast notifications

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

### Supabase Integration
- Use `@/lib/supabase` client for all Supabase operations
- Handle auth state changes in composables
- Use `readonly()` for user state to prevent mutations
- Return `{ success: boolean, error?: string }` pattern for auth operations

### Styling Guidelines
- Use scoped styles in Vue components
- Prefer TDesign's CSS variables for theming
- Use `var(--td-text-color-secondary)` for muted text
- Use flexbox with `justify-content: flex-end` for right-aligned actions
