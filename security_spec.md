# Firestore Security Specification

## 1. Data Invariants
- A **Farmer** profile must be owned by the authenticated user (`uid` matches `request.auth.uid`).
- A **Product** must belong to a valid Farmer profile.
- A **Product** can only be created or modified by the Farmer who owns it.
- **Orders** must link a Customer to a Farmer and a Product.
- **Orders** can only be read by the customer who placed it or the farmer who received it.
- All users must have a verified email to perform write operations (create/update/delete).

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Farmer Spoofing**: Attempt to create a farmer profile with a `uid` that doesn't match the authenticated user.
2. **Product Hijacking**: Attempt to create a product for another farmer's `farmerId`.
3. **Price Manipulation**: Update a product price with a negative value.
4. **Order Status Injection**: A customer attempting to update their own order status to `delivered`.
5. **Unauthorized Order Peek**: A user attempting to read an order they didn't place and don't own.
6. **Ghost Region**: Creating a product with a region not in the Namibia Regions list.
7. **Jumbo ID**: Injecting a 2KB string as a document ID.
8. **Shadow Field**: Adding `isVerified: true` to a product payload during update.
9. **Identity Erasure**: Attempting to change the `ownerId` or `farmerId` of an existing product.
10. **Unverified Write**: An authenticated user with `email_verified: false` attempting to list a product.
11. **Orphaned Product**: Creating a product referencing a non-existent `farmerId` (Note: can only check existence if farmerId is provided).
12. **PII Leak**: A guest user attempting to list all farmer profiles with WhatsApp numbers. (Note: Farmers are public, but we should ensure only necessary data is public).

## 3. Test Runner Plan
We will implement `firestore.rules` to reject all the above cases.

## 4. Current Failure Analysis
- **List Products**: Currently `allow read: if true` exists, yet it's failing. This might be due to the global deny or a lack of explicit `list` condition that satisfies the query (e.g. `resource.data.farmerId`).
- **Create Farmer**: Likely failing due to missing fields in `isValidFarmer` or the regex failing in the rules environment. We need to unify the validation.
