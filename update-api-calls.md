# API Migration Guide

## ✅ Completed Updates

The following files have been successfully updated to use the new API configuration:

1. **src/pages/login.tsx** - Updated to use `authAPI.login()`
2. **src/pages/signup.tsx** - Updated to use `authAPI.signup()` and `authAPI.getRoles()`
3. **src/context/AuthContext.tsx** - Updated to use `authAPI.logout()`
4. **src/pages/teams.tsx** - Updated to use `servicesAPI.getTeamsWithMembers()`, `servicesAPI.getUsers()`, `servicesAPI.getRoles()`, `servicesAPI.deleteTeam()`
5. **src/pages/userManagement.tsx** - Updated to use `servicesAPI.getUsers()`, `servicesAPI.createUser()`, `servicesAPI.deleteUser()`, `servicesAPI.updateUser()`
6. **src/pages/locationManagement.tsx** - Updated to use `servicesAPI.getBranches()`, `servicesAPI.getWarehouses()`, `servicesAPI.getLocations()`, `servicesAPI.getSections()`, `servicesAPI.getItemGroups()`, `servicesAPI.createLocation()`
7. **src/pages/sections.tsx** - Updated to use `servicesAPI.getSections()`, `servicesAPI.createSection()`
8. **src/pages/assignItem.tsx** - Updated to use `servicesAPI.getForms()`, `servicesAPI.getAssignedItems()`, `servicesAPI.assignForms()`, `servicesAPI.deleteAssignedItem()`, `servicesAPI.deleteAssignedLocation()`

## 🔄 Remaining Files to Update

The following files still need to be updated to use the new API configuration:

### High Priority Files:
1. **src/pages/items.tsx** - Multiple axios calls to update
2. **src/pages/counter.tsx** - Multiple axios calls to update
3. **src/pages/checker.tsx** - Multiple axios calls to update
4. **src/pages/reconciliation.tsx** - Multiple axios calls to update
5. **src/pages/reconciliationRecords.tsx** - Multiple axios calls to update
6. **src/pages/checkerReviewPage.tsx** - Multiple axios calls to update
7. **src/pages/counterReviewPage.tsx** - Multiple axios calls to update
8. **src/pages/viewSections.tsx** - Multiple axios calls to update
9. **src/pages/AddTeamDialog.tsx** - Multiple axios calls to update
10. **src/pages/EditTeamDialog.tsx** - Multiple axios calls to update

### Medium Priority Files:
11. **src/pages/assigned-checkers.tsx** - Single axios call
12. **src/pages/submitController.tsx** - Single axios call
13. **src/components/ReconciliationDialog.tsx** - Multiple axios calls
14. **src/pages/checkerReviewPage_improved.tsx** - Multiple axios calls

## 📋 API Mapping Reference

### Authentication API (`authAPI`)
- `authAPI.login(user_name, password)` - POST /services/auth/login
- `authAPI.logout()` - POST /services/auth/logout
- `authAPI.signup(data)` - POST /services/auth/register
- `authAPI.getRoles()` - GET /services/roles

### Services API (`servicesAPI`)

#### Locations
- `servicesAPI.getLocations()` - GET /services/locations
- `servicesAPI.getLocation(id)` - GET /services/locations/{id}
- `servicesAPI.createLocation(data)` - POST /services/locations
- `servicesAPI.getItemGroups(locationId)` - GET /services/locations/{locationId}/item-groups

#### Sections
- `servicesAPI.getSections(locationId)` - GET /services/sections?location_id={locationId}
- `servicesAPI.createSection(data)` - POST /services/sections
- `servicesAPI.deleteSection(id)` - DELETE /services/sections/{id}

#### Teams
- `servicesAPI.getTeams()` - GET /services/teams
- `servicesAPI.getTeam(id)` - GET /services/teams/{id}
- `servicesAPI.createTeam(data)` - POST /services/teams
- `servicesAPI.deleteTeam(id)` - DELETE /services/teams/{id}
- `servicesAPI.getTeamsWithMembers()` - GET /services/teams-with-members
- `servicesAPI.getTeamTagRange(teamId)` - GET /services/teams/{teamId}/tag-range

#### Users
- `servicesAPI.getUsers()` - GET /services/users
- `servicesAPI.createUser(data)` - POST /services/users
- `servicesAPI.deleteUser(id)` - DELETE /services/users/{id}
- `servicesAPI.updateUser(id, data)` - POST /services/users/{id}

#### Forms and Assignments
- `servicesAPI.getAssignedLocations()` - GET /services/assigned-locations
- `servicesAPI.getAssignedItems(locationId)` - GET /services/assigned-items/{locationId}
- `servicesAPI.assignForms(data)` - POST /services/assign-forms
- `servicesAPI.deleteAssignedItem(locationId, itemId)` - DELETE /services/assigned-items/{locationId}/{itemId}
- `servicesAPI.deleteAssignedLocation(locationId)` - DELETE /services/assigned-items/{locationId}
- `servicesAPI.assignTeam(data)` - POST /services/assign-team

#### Items
- `servicesAPI.getItems()` - GET /services/items
- `servicesAPI.getForms(locationId)` - GET /services/forms/{locationId}
- `servicesAPI.getCombinations(params)` - GET /services/combinations

#### Checker and Counter
- `servicesAPI.getCheckerLocations(userId)` - GET /services/checker?user_id={userId}
- `servicesAPI.getCounterLocations(userId)` - GET /services/counter?user_id={userId}
- `servicesAPI.getCheckerSku(params)` - GET /services/checker-sku
- `servicesAPI.getCounterSku(params)` - GET /services/counter-sku
- `servicesAPI.verifyItem(data)` - POST /services/verify-item
- `servicesAPI.countItem(data)` - POST /services/count-item

#### Transactions
- `servicesAPI.getTransactions(params)` - GET /services/transactions
- `servicesAPI.createTransaction(data)` - POST /services/transactions

#### Options and Lookups
- `servicesAPI.getGrade(params)` - GET /services/grade
- `servicesAPI.getSize(params)` - GET /services/size
- `servicesAPI.getFinish(params)` - GET /services/finish
- `servicesAPI.getExtFinish(params)` - GET /services/extfinish
- `servicesAPI.getWidth(params)` - GET /services/width
- `servicesAPI.getLength(params)` - GET /services/length
- `servicesAPI.getMill(params)` - GET /services/mill
- `servicesAPI.getHeat(params)` - GET /services/heat
- `servicesAPI.getRemarks()` - GET /services/remarks

#### Dashboard
- `servicesAPI.getDashboardAnalytics()` - GET /services/dashboard-analytics

#### Branches and Warehouses
- `servicesAPI.getBranches()` - GET /services/branches
- `servicesAPI.getWarehouses(branch)` - GET /services/warehouses?branch={branch}

#### Review and Reconciliation
- `servicesAPI.getReviewTransactions(params)` - GET /services/review-transactions
- `servicesAPI.enableChecker(locationId, sectionId)` - POST /services/sections/{locationId}/{sectionId}/enable-checker
- `servicesAPI.enableCheckerSKU(locationId, data)` - POST /services/sections/{locationId}/enable-checker-sku
- `servicesAPI.reconcileInventory(data)` - POST /services/reconcile
- `servicesAPI.getInventoryReconciliation(locationId, params)` - GET /services/locations/{locationId}/reconciliation

## 🔧 Update Pattern

For each file, follow this pattern:

1. **Replace import:**
   ```typescript
   // Old
   import axios from 'axios';
   
   // New
   import { servicesAPI, authAPI } from '../config/api';
   ```

2. **Replace axios calls:**
   ```typescript
   // Old
   const response = await axios.get('http://localhost:5000/services/locations');
   
   // New
   const response = await servicesAPI.getLocations();
   ```

3. **Update error handling:**
   ```typescript
   // Old
   if (axios.isAxiosError(error)) {
     // handle error
   }
   
   // New
   if (error && typeof error === 'object' && 'response' in error) {
     const axiosError = error as { response?: { data?: { error?: string } } };
     // handle error
   }
   ```

## 🚀 Benefits

- **Centralized Configuration**: All API calls use the same base URL and CORS settings
- **Better Error Handling**: Consistent error handling across the application
- **Type Safety**: Better TypeScript support with proper typing
- **Maintainability**: Easier to update API endpoints in one place
- **CORS Support**: Proper CORS handling with your API_BASE_URL 