using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class AuthenticationProtection : Migration
    {
        private static readonly string[] CapacityColumns = ["Scope", "Allocated"];
        private static readonly string[] ThrottleCleanupColumns = ["WindowEndsAt", "NextAllowedAt", "NextEmissionAt"];
        private static readonly string[] RecoverySelectionColumns = ["Status", "NextAttemptAt", "LeaseUntil"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $authentication_protection$
                DECLARE
                    duplicate_group_count bigint;
                BEGIN
                    SELECT COUNT(*)
                    INTO duplicate_group_count
                    FROM (
                        SELECT "Email"
                        FROM "Usuarios"
                        GROUP BY "Email"
                        HAVING COUNT(*) > 1
                    ) AS duplicate_email_groups;

                    IF duplicate_group_count > 0 THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '23505',
                            MESSAGE = 'Authentication protection migration requires exact duplicate email values to be resolved before the unique index can be created.',
                            DETAIL = format('Sanitized diagnostic: %s duplicate email group(s) found.', duplicate_group_count);
                    END IF;
                END $authentication_protection$;
                """);

            migrationBuilder.CreateTable(
                name: "AuthenticationProtectionCapacity",
                columns: table => new
                {
                    Scope = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Allocated = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthenticationProtectionCapacity", x => x.Scope);
                    table.CheckConstraint("CK_AuthenticationProtectionCapacity_Allocated_NonNegative", "\"Allocated\" >= 0");
                });

            migrationBuilder.CreateTable(
                name: "AuthenticationThrottleBuckets",
                columns: table => new
                {
                    Scope = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    KeyHash = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    WindowStartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    WindowEndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Count = table.Column<int>(type: "integer", nullable: false),
                    NextAllowedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NextEmissionAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthenticationThrottleBuckets", x => new { x.Scope, x.KeyHash });
                    table.CheckConstraint("CK_AuthenticationThrottleBuckets_Count_NonNegative", "\"Count\" >= 0");
                    table.CheckConstraint("CK_AuthenticationThrottleBuckets_KeyHash_Length", "octet_length(\"KeyHash\") = 32");
                    table.CheckConstraint("CK_AuthenticationThrottleBuckets_Window", "\"WindowEndsAt\" > \"WindowStartedAt\"");
                });

            migrationBuilder.CreateTable(
                name: "PasswordRecoveryJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeliveryKeyHash = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    RecipientKeyHash = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    PayloadCiphertext = table.Column<byte[]>(type: "bytea", nullable: false),
                    PayloadNonce = table.Column<byte[]>(type: "bytea", maxLength: 12, nullable: false),
                    PayloadTag = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: false),
                    EncryptionKeyId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LeaseId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeaseUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    SessionVersion = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordRecoveryJobs", x => x.Id);
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Attempts", "\"Attempts\" BETWEEN 0 AND 3");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Expiry", "\"ExpiresAt\" > \"CreatedAt\"");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Hash_Lengths", "octet_length(\"DeliveryKeyHash\") = 32 AND octet_length(\"RecipientKeyHash\") = 32");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Lease_Pair", "(\"LeaseId\" IS NULL) = (\"LeaseUntil\" IS NULL)");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Nonce_Length", "octet_length(\"PayloadNonce\") = 12");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_SessionVersion", "\"SessionVersion\" IS NULL OR \"SessionVersion\" >= 0");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Status", "\"Status\" IN ('Pending', 'Processing', 'Completed', 'Cancelled', 'Failed')");
                    table.CheckConstraint("CK_PasswordRecoveryJobs_Tag_Length", "octet_length(\"PayloadTag\") = 16");
                    table.ForeignKey(
                        name: "FK_PasswordRecoveryJobs_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "AuthenticationProtectionCapacity",
                columns: CapacityColumns,
                values: new object[,]
                {
                    { "login:account", 0 },
                    { "login:ip", 0 },
                    { "recovery-code:ip", 0 },
                    { "recovery-code:recipient", 0 },
                    { "recovery-jobs", 0 },
                    { "recovery-request:ip", 0 },
                    { "recovery-request:recipient", 0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Email",
                table: "Usuarios",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthenticationThrottleBuckets_Cleanup",
                table: "AuthenticationThrottleBuckets",
                columns: ThrottleCleanupColumns);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordRecoveryJobs_Selection",
                table: "PasswordRecoveryJobs",
                columns: RecoverySelectionColumns);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordRecoveryJobs_UserId",
                table: "PasswordRecoveryJobs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UX_PasswordRecoveryJobs_ActiveDeliveryKey",
                table: "PasswordRecoveryJobs",
                column: "DeliveryKeyHash",
                unique: true,
                filter: "\"Status\" IN ('Pending', 'Processing')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuthenticationProtectionCapacity");

            migrationBuilder.DropTable(
                name: "AuthenticationThrottleBuckets");

            migrationBuilder.DropTable(
                name: "PasswordRecoveryJobs");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_Email",
                table: "Usuarios");
        }
    }
}
