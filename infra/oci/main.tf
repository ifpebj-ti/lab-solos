resource "oci_identity_compartment" "labon" {
  compartment_id = var.tenancy_ocid
  name           = var.compartment_name
  description    = "Infraestrutura de produção do LabOn"
  enable_delete  = false
}

data "oci_identity_availability_domains" "available" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu" {
  compartment_id           = oci_identity_compartment.labon.id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_vcn" "labon" {
  compartment_id = oci_identity_compartment.labon.id
  cidr_blocks    = ["10.42.0.0/16"]
  display_name   = "labon-vcn"
  dns_label      = "labon"
}

resource "oci_core_internet_gateway" "labon" {
  compartment_id = oci_identity_compartment.labon.id
  vcn_id         = oci_core_vcn.labon.id
  display_name   = "labon-internet-gateway"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = oci_identity_compartment.labon.id
  vcn_id         = oci_core_vcn.labon.id
  display_name   = "labon-public-routes"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.labon.id
  }
}

resource "oci_core_security_list" "public" {
  compartment_id = oci_identity_compartment.labon.id
  vcn_id         = oci_core_vcn.labon.id
  display_name   = "labon-public-security-list"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6"
    source   = var.admin_cidr

    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    protocol = "17"
    source   = "0.0.0.0/0"

    udp_options {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = oci_identity_compartment.labon.id
  vcn_id                     = oci_core_vcn.labon.id
  cidr_block                 = "10.42.1.0/24"
  display_name               = "labon-public-subnet"
  dns_label                  = "public"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.public.id]
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_instance" "labon" {
  availability_domain = data.oci_identity_availability_domains.available.availability_domains[0].name
  compartment_id      = oci_identity_compartment.labon.id
  display_name        = "labon-prod"
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gbs
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    display_name     = "labon-prod-vnic"
    hostname_label   = "app"
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size_gbs
    boot_volume_vpus_per_gb = 10
  }

  metadata = {
    ssh_authorized_keys = file(pathexpand(var.ssh_public_key_path))
    user_data           = filebase64("${path.module}/cloud-init.yaml")
  }

  availability_config {
    recovery_action = "RESTORE_INSTANCE"
  }

  freeform_tags = {
    Application = "LabOn"
    Environment = "production"
    Domain      = var.app_domain
  }
}
