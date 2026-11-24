using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabSolos_Server_DotNet8.Data.Migrations
{
    /// <inheritdoc />
    public partial class EmailAddressReservation : Migration
    {
        private static readonly string[] PendingNoticeIndexColumns = ["Status", "NextAttemptAt", "DeadlineAt"];
        private static readonly string[] OperationRecipientIndexColumns = ["OperationId", "Recipient"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmailAddressReservations",
                columns: table => new
                {
                    NormalizedAddressHash = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    OwnerUserId = table.Column<int>(type: "integer", nullable: true),
                    ReservedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailAddressReservations", x => x.NormalizedAddressHash);
                    table.CheckConstraint("CK_EmailAddressReservations_Expiry", "\"ExpiresAt\" > \"ReservedAt\"");
                    table.CheckConstraint("CK_EmailAddressReservations_Hash_Length", "octet_length(\"NormalizedAddressHash\") = 32");
                    table.ForeignKey(
                        name: "FK_EmailAddressReservations_Usuarios_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "EmailChangeNoticeJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OperationId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    Recipient = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RecipientKeyHash = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    PayloadCiphertext = table.Column<byte[]>(type: "bytea", nullable: false),
                    PayloadNonce = table.Column<byte[]>(type: "bytea", maxLength: 12, nullable: false),
                    PayloadTag = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: false),
                    EncryptionKeyId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeadlineAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetainUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LeaseId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeaseUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastFailureCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailChangeNoticeJobs", x => x.Id);
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Attempts", "\"Attempts\" BETWEEN 0 AND 3");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Deadline", "\"DeadlineAt\" > \"CreatedAt\" AND \"RetainUntil\" > \"CreatedAt\"");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Hash_Lengths", "octet_length(\"RecipientKeyHash\") = 32");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Lease_Pair", "(\"LeaseId\" IS NULL) = (\"LeaseUntil\" IS NULL)");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Nonce_Length", "octet_length(\"PayloadNonce\") = 12");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Recipient", "\"Recipient\" IN ('PreviousAddress', 'NewAddress')");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Status", "\"Status\" IN ('Pending', 'Processing', 'Delivered', 'Failed')");
                    table.CheckConstraint("CK_EmailChangeNoticeJobs_Tag_Length", "octet_length(\"PayloadTag\") = 16");
                    table.ForeignKey(
                        name: "FK_EmailChangeNoticeJobs_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailAddressReservations_Expiry",
                table: "EmailAddressReservations",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_EmailAddressReservations_OwnerUserId",
                table: "EmailAddressReservations",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeNoticeJobs_Pending",
                table: "EmailChangeNoticeJobs",
                columns: PendingNoticeIndexColumns);

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeNoticeJobs_Retention",
                table: "EmailChangeNoticeJobs",
                column: "RetainUntil");

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeNoticeJobs_UserId",
                table: "EmailChangeNoticeJobs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UX_EmailChangeNoticeJobs_Operation_Recipient",
                table: "EmailChangeNoticeJobs",
                columns: OperationRecipientIndexColumns,
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailAddressReservations");

            migrationBuilder.DropTable(
                name: "EmailChangeNoticeJobs");
        }
    }
}
