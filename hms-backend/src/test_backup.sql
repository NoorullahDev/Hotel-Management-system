-- Backup Generated on 2026-07-23T23:26:58.335Z

-- DELETE ALL ROWS
DELETE FROM "AuditLog";
DELETE FROM "NotificationPreference";
DELETE FROM "Notification";
DELETE FROM "Feedback";
DELETE FROM "OrderItem";
DELETE FROM "FoodOrder";
DELETE FROM "InvoiceItem";
DELETE FROM "Invoice";
DELETE FROM "Payment";
DELETE FROM "HousekeepingTask";
DELETE FROM "RoomMaintenance";
DELETE FROM "Booking";
DELETE FROM "Room";
DELETE FROM "Staff";
DELETE FROM "User";
DELETE FROM "Guest";
DELETE FROM "RoomType";
DELETE FROM "MenuCategory";
DELETE FROM "MenuItem";
DELETE FROM "HotelSettings";
DELETE FROM "Setting";
DELETE FROM "Role";

-- Table: Role
INSERT INTO "Role" ("id", "name", "permissions") VALUES ('cde0962b-be8b-41bf-a019-6024196f688a', 'Admin', '[]');
INSERT INTO "Role" ("id", "name", "permissions") VALUES ('a7291701-852f-40d4-8bfd-46c5433a9811', 'Manager', '[]');
INSERT INTO "Role" ("id", "name", "permissions") VALUES ('078ccdc2-607f-4db6-b794-e7dcdae8d33f', 'Receptionist', '[]');
INSERT INTO "Role" ("id", "name", "permissions") VALUES ('e1ca701c-db7d-42b5-995b-766e3cf19a92', 'Housekeeping', '[]');
INSERT INTO "Role" ("id", "name", "permissions") VALUES ('8278953b-e01f-4cc8-a1fd-4f8ff9f63d60', 'Restaurant', '[]');

-- Table: HotelSettings
INSERT INTO "HotelSettings" ("id", "name", "taxRate", "currency", "defaultCheckIn", "defaultCheckOut", "loginBackgroundImage") VALUES ('2c91c539-cc0a-4b62-9432-8cc31abe7be5', 'Grand Park Hotel', 0.1, 'PKR', '14:00', '11:00', NULL);

-- Table: MenuCategory
INSERT INTO "MenuCategory" ("id", "name") VALUES ('182a41f5-54ca-42de-8f7a-89893848933e', 'Starter');
INSERT INTO "MenuCategory" ("id", "name") VALUES ('5c02ff7a-77f1-48f0-9fba-e9483b3dd132', 'Main Course');
INSERT INTO "MenuCategory" ("id", "name") VALUES ('69605e55-cb90-48a1-9013-31ce1eaf5f87', 'Beverage');
INSERT INTO "MenuCategory" ("id", "name") VALUES ('5a792dde-5e36-4355-b8a3-da1a4636190e', 'Dessert');

-- Table: RoomType
INSERT INTO "RoomType" ("id", "name") VALUES ('e1bd7a26-7c60-4a35-be63-9ed0add5fba1', 'Single');
INSERT INTO "RoomType" ("id", "name") VALUES ('b941f957-9974-40e1-afa6-dbad1494c0ab', 'Double');
INSERT INTO "RoomType" ("id", "name") VALUES ('5223331d-3175-4aec-a544-b3c2beafadd8', 'Deluxe');
INSERT INTO "RoomType" ("id", "name") VALUES ('aad7148b-31a6-4cd9-a563-343e2254e1a6', 'Suite');

-- Table: Guest
INSERT INTO "Guest" ("id", "guestType", "name", "email", "phone", "idType", "idNumber", "nationality", "city", "country", "address", "notes") VALUES ('12461e29-a4e3-4478-8b33-932e93e3cf18', 'LOCAL', 'Jane Smith', 'jane@example.com', '0987654321', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Guest" ("id", "guestType", "name", "email", "phone", "idType", "idNumber", "nationality", "city", "country", "address", "notes") VALUES ('5567e902-3b90-4e62-ab08-8342aca36ef6', 'LOCAL', 'Alice Johnson', 'alice@example.com', '5551234567', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Guest" ("id", "guestType", "name", "email", "phone", "idType", "idNumber", "nationality", "city", "country", "address", "notes") VALUES ('93763223-1636-4b88-a2f5-01675a7e86d9', 'FOREIGN', 'Foreign Dude', NULL, '123', 'Passport', 'AB12345', NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Guest" ("id", "guestType", "name", "email", "phone", "idType", "idNumber", "nationality", "city", "country", "address", "notes") VALUES ('e277ff00-5045-4bf1-a582-7f1a5e8d795d', 'LOCAL', 'Local Dude', NULL, '987', 'CNIC', '111-222', NULL, NULL, NULL, NULL, NULL);

-- Table: User
INSERT INTO "User" ("id", "username", "email", "passwordHash", "name", "phone", "profilePhoto", "roleId", "oauthProvider", "failedLoginAttempts", "lockedUntil") VALUES ('d9469b3e-b53d-4c52-b7c0-9a68d3884c93', 'admin', 'admin@grandparkhotel.com', '$2b$10$O4/bxxuRCO3othgrwFR.iOknH5Tn2JyuvEiCmv2qgJ9ga2zFAzEV6', 'Super Admin', NULL, NULL, 'cde0962b-be8b-41bf-a019-6024196f688a', NULL, 0, NULL);
INSERT INTO "User" ("id", "username", "email", "passwordHash", "name", "phone", "profilePhoto", "roleId", "oauthProvider", "failedLoginAttempts", "lockedUntil") VALUES ('b1cea492-18b1-4d64-be99-44d0fb605bb4', 'hkstaff', 'hk@test.com', 'hash', 'HK Staff', NULL, NULL, 'cde0962b-be8b-41bf-a019-6024196f688a', NULL, 0, NULL);
INSERT INTO "User" ("id", "username", "email", "passwordHash", "name", "phone", "profilePhoto", "roleId", "oauthProvider", "failedLoginAttempts", "lockedUntil") VALUES ('3827eb42-9dac-41b5-9c09-80fb97498d5e', 'rectest', 'rectest@test.com', '123', 'Rec Test', NULL, NULL, '078ccdc2-607f-4db6-b794-e7dcdae8d33f', NULL, 0, NULL);

-- Table: Staff
INSERT INTO "Staff" ("id", "userId", "employeeId", "role", "department", "shift", "attendance", "hireDate", "status") VALUES ('50d6c4a8-69f1-4028-baff-fb3041cf4fa4', 'b1cea492-18b1-4d64-be99-44d0fb605bb4', '181c57ee-44d7-41e5-a669-44fa4ca2d992', 'Staff', 'Housekeeping', NULL, 100, '2026-07-23T21:06:17.307Z', 'Active');

-- Table: Room
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('acfeaf12-1e25-4004-9a2a-1f0894174f90', '101', 1, 'e1bd7a26-7c60-4a35-be63-9ed0add5fba1', 100, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('315b2963-88e1-4c7f-8cfd-5ada38d2a96d', '102', 1, 'b941f957-9974-40e1-afa6-dbad1494c0ab', 150, 'OCCUPIED', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('17d060ff-a784-4553-a73a-6e0b011f9ccd', '103', 1, '5223331d-3175-4aec-a544-b3c2beafadd8', 250, 'RESERVED', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('def824fe-63fe-48c2-aa9f-2d629e8a6f1b', '104', 1, 'aad7148b-31a6-4cd9-a563-343e2254e1a6', 500, 'CLEANING', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('968bb93e-c690-4af4-a900-e330a5a692b0', '105', 1, 'e1bd7a26-7c60-4a35-be63-9ed0add5fba1', 100, 'MAINTENANCE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('6ad2535f-2092-488a-a450-33d1dbb55376', '106', 1, 'b941f957-9974-40e1-afa6-dbad1494c0ab', 150, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('9787cb73-6378-4da8-9567-fa6449174e26', '107', 1, '5223331d-3175-4aec-a544-b3c2beafadd8', 250, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('84ad7911-d31e-422b-8724-16e5e0e1a499', '108', 1, 'aad7148b-31a6-4cd9-a563-343e2254e1a6', 500, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('695ce8b0-d183-4148-b894-1f4e6d1f8959', '109', 1, 'e1bd7a26-7c60-4a35-be63-9ed0add5fba1', 100, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('3d8a1be8-0529-4fc8-92b7-5a2ed9279ba1', '110', 1, 'b941f957-9974-40e1-afa6-dbad1494c0ab', 150, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('d8e06809-6d0b-442a-9326-e18f87bd5271', '201', 2, '5223331d-3175-4aec-a544-b3c2beafadd8', 250, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('d35ab4c2-a423-4407-820c-d6fa72fca959', '202', 2, 'aad7148b-31a6-4cd9-a563-343e2254e1a6', 500, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('2255e2cb-400f-4876-93a8-defa3630305b', '203', 2, 'e1bd7a26-7c60-4a35-be63-9ed0add5fba1', 100, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('806f7dc9-eddf-4a00-be72-a92078723bea', '204', 2, 'b941f957-9974-40e1-afa6-dbad1494c0ab', 150, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('bebaeee1-7ba0-48fe-a32e-a2f4575f0d34', '205', 2, '5223331d-3175-4aec-a544-b3c2beafadd8', 250, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('8c900acb-87f0-4e1f-9773-03e8a2d498f0', '206', 2, 'aad7148b-31a6-4cd9-a563-343e2254e1a6', 500, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('6696e5e9-9969-4144-8bf3-dc17350b603c', '207', 2, 'e1bd7a26-7c60-4a35-be63-9ed0add5fba1', 100, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('a302132b-94b4-459e-90b0-4db1f5273f05', '208', 2, 'b941f957-9974-40e1-afa6-dbad1494c0ab', 150, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('7547c1a1-8dad-45a2-b9db-f48617960a2b', '209', 2, '5223331d-3175-4aec-a544-b3c2beafadd8', 250, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);
INSERT INTO "Room" ("id", "number", "floor", "roomTypeId", "price", "status", "amenities", "imageUrl") VALUES ('5d8a4711-8278-4fcb-8e22-b8c4b6c204d3', '210', 2, 'aad7148b-31a6-4cd9-a563-343e2254e1a6', 500, 'AVAILABLE', '["Wi-Fi","TV","Air Conditioning"]', NULL);

-- Table: Booking
INSERT INTO "Booking" ("id", "bookingType", "guestId", "roomId", "checkIn", "checkOut", "arrivalTime", "guestCount", "additionalGuests", "status", "subtotal", "tax", "total", "createdAt") VALUES ('ef2ffeb2-f3b1-4d66-bdc1-8fa0c52bdba4', 'LOCAL', '12461e29-a4e3-4478-8b33-932e93e3cf18', '315b2963-88e1-4c7f-8cfd-5ada38d2a96d', '2026-07-21T21:00:00.000Z', '2026-07-23T18:00:00.000Z', NULL, 2, NULL, 'CHECKED_IN', 300, 30, 330, '2026-07-22T17:58:54.350Z');
INSERT INTO "Booking" ("id", "bookingType", "guestId", "roomId", "checkIn", "checkOut", "arrivalTime", "guestCount", "additionalGuests", "status", "subtotal", "tax", "total", "createdAt") VALUES ('99d38703-8a8f-4a02-8ad5-80590d90a305', 'LOCAL', '5567e902-3b90-4e62-ab08-8342aca36ef6', '17d060ff-a784-4553-a73a-6e0b011f9ccd', '2026-07-23T21:00:00.000Z', '2026-07-25T21:00:00.000Z', NULL, 1, NULL, 'CONFIRMED', 750, 75, 825, '2026-07-22T17:58:54.536Z');

-- Table: Notification
INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "referenceId", "metadata", "isRead", "createdAt") VALUES ('9991a188-470e-41ed-a690-312431615b56', 'b1cea492-18b1-4d64-be99-44d0fb605bb4', 'Housekeeping', 'Room cleaning completed', 'Housekeeping completed cleaning for Room TEST-HK.', '6dbf8962-265e-4bc4-8233-f53933f3dc44', '{"Room Number":"TEST-HK","Task Type":"Cleaning","Priority":"Medium","Completed At":"Jul 23, 2026, 2:06 PM"}', 0, '2026-07-23T21:06:18.365Z');
INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "referenceId", "metadata", "isRead", "createdAt") VALUES ('e5843dfb-566f-48f7-a717-5cfced888b69', 'b1cea492-18b1-4d64-be99-44d0fb605bb4', 'Housekeeping', 'Room cleaning completed', 'Housekeeping completed cleaning for Room TEST-HK.', '6dbf8962-265e-4bc4-8233-f53933f3dc44', '{"Room Number":"TEST-HK","Task Type":"Maintenance","Priority":"High","Completed At":"Jul 23, 2026, 2:06 PM"}', 0, '2026-07-23T21:06:18.830Z');

