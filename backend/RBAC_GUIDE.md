# Role-Based Access Control (RBAC) Guide

## Overview

The Salon Association Platform implements a comprehensive RBAC system with 6 user roles:

1. **SUPER_ADMIN** - Full system access
2. **ASSOCIATION_ADMIN** - Association-wide management
3. **DISTRICT_LEADER** - District-level management
4. **SALON_OWNER** - Own salon management
5. **SALON_EMPLOYEE** - Limited salon access
6. **CUSTOMER** - Basic customer access

## Role Hierarchy

Roles follow a hierarchy where higher roles inherit permissions from lower roles:

```
SUPER_ADMIN > ASSOCIATION_ADMIN > DISTRICT_LEADER > SALON_OWNER > SALON_EMPLOYEE > CUSTOMER
```

## Implementation

### 1. Guards

#### JwtAuthGuard
- Validates JWT token
- Extracts user information from token
- Required for all protected routes

#### RolesGuard
- Checks if user has required role(s)
- Throws `ForbiddenException` if access denied
- Works with `@Roles()` decorator

### 2. Decorators

#### @Roles()
```typescript
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
@Get()
findAll() {
  // Only super admin and association admin can access
}
```

#### @CurrentUser()
```typescript
@Get(':id')
findOne(@Param('id') id: string, @CurrentUser() user: any) {
  // Access current authenticated user
  console.log(user.id, user.role);
}
```

### 3. Usage Example

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('salons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalonsController {
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  findAll() {
    // Only admins can see all salons
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SALON_OWNER)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Check ownership for salon owners
    if (user.role === UserRole.SALON_OWNER) {
      // Verify ownership
    }
  }
}
```

## Permission Patterns

### 1. Admin-Only Routes
```typescript
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
```

### 2. Owner + Admin Routes
```typescript
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
```

### 3. Resource Ownership Check
```typescript
@Get(':id')
@Roles(UserRole.SUPER_ADMIN, UserRole.SALON_OWNER)
async findOne(@Param('id') id: string, @CurrentUser() user: any) {
  const resource = await this.service.findOne(id);
  
  if (user.role === UserRole.SALON_OWNER && resource.ownerId !== user.id) {
    throw new ForbiddenException('Access denied');
  }
  
  return resource;
}
```

## Role Permissions Matrix

| Action | SUPER_ADMIN | ASSOC_ADMIN | DISTRICT_LEADER | SALON_OWNER | SALON_EMPLOYEE | CUSTOMER |
|--------|-------------|-------------|-----------------|-------------|----------------|----------|
| View all salons | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View own salon | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create salon | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Update any salon | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update own salon | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Delete salon | ✅ | ✅ | ❌ | ✅* | ❌ | ❌ |
| Manage employees | ✅ | ✅ | ❌ | ✅* | ❌ | ❌ |

*Only for own salon

## Best Practices

1. **Always use both guards**: `@UseGuards(JwtAuthGuard, RolesGuard)`
2. **Check ownership in service/controller**: Don't rely only on role checks
3. **Use @CurrentUser() decorator**: Access authenticated user info
4. **Throw ForbiddenException**: When access is denied
5. **Document role requirements**: Use Swagger `@ApiOperation` with role info

## Error Responses

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Forbidden (403)
```json
{
  "statusCode": 403,
  "message": "Access denied. Required roles: super_admin, association_admin. Your role: salon_owner"
}
```

## Testing RBAC

1. Create test users with different roles
2. Test each endpoint with different roles
3. Verify ownership checks work correctly
4. Test edge cases (missing token, invalid role, etc.)

