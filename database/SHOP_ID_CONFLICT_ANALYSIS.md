# Database Analysis Report: shop_id vs barbershop_id Conflict

**Generated**: 2025-10-17T02:17:09.447Z

---

## Executive Summary

- **Total Tables Analyzed**: 11
- **Tables with BOTH Columns**: 0 🚨
- **Tables with shop_id Only**: 0
- **Tables with barbershop_id Only**: 8

- **Total shop_id Records**: 0
- **Total barbershop_id Records**: 326

### ✅ No Critical Issues

All tables are using identifiers consistently.

---

## Detailed Table Analysis

### profiles

- **Total Rows**: 41
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 11

**Sample Records** (first 5):

```json
[
  {
    "id": "7af47a37-fff9-49e9-a686-bc3a5f0bdf54",
    "barbershop_id": null
  },
  {
    "id": "303bb1b9-5d25-4874-8380-4de3ad1e965c",
    "barbershop_id": "1ca6138d-eae8-46ed-abff-5d6e52fbd21b"
  },
  {
    "id": "5ec6e99c-c639-4529-8953-415213dd0e35",
    "barbershop_id": "c5a58548-8f23-426c-bedc-49a83d238724"
  },
  {
    "id": "d6c5e7f5-dca9-4cac-9fe2-a4737e71baa1",
    "barbershop_id": "c5a58548-8f23-426c-bedc-49a83d238724"
  },
  {
    "id": "fe0f25ff-0261-44bc-b3f1-c2e4eb2307f6",
    "barbershop_id": "9306d931-7ab0-45b7-88d5-599678085526"
  }
]
```

### customers

- **Total Rows**: 200
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 197

**Sample Records** (first 5):

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "barbershop_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440022",
    "barbershop_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440023",
    "barbershop_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  {
    "id": "68797776-c53f-46e3-a05d-8ec21be887a2",
    "barbershop_id": "1ca6138d-eae8-46ed-abff-5d6e52fbd21b"
  },
  {
    "id": "aa2b63f6-b48b-459b-a5c3-82e21ba5dda2",
    "barbershop_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
]
```

### services

- **Total Rows**: 32
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 32

**Sample Records** (first 5):

```json
[
  {
    "id": "3aa2567c-9f7b-48b8-a29b-89c8a0dbfd79",
    "barbershop_id": "aa188b4a-eb7d-4655-a45a-2c7436013f01"
  },
  {
    "id": "d21ed9b0-042c-4dd5-a6a0-411db9f04ea0",
    "barbershop_id": "aa188b4a-eb7d-4655-a45a-2c7436013f01"
  },
  {
    "id": "7694bd4d-58e1-4ee7-9b34-26b772bff5cf",
    "barbershop_id": "aa188b4a-eb7d-4655-a45a-2c7436013f01"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "barbershop_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440012",
    "barbershop_id": "550e8400-e29b-41d4-a716-446655440001"
  }
]
```

### appointment_records

- **Total Rows**: 0
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✗

### customers_backup

- **Total Rows**: 101
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 70

**Sample Records** (first 5):

```json
[
  {
    "id": "e91dd39c-21e6-41ea-8ac3-c908e6fb88f2",
    "barbershop_id": "demo-shop-001"
  },
  {
    "id": "a7ff11ac-8182-4876-bd63-51d944c3b04b",
    "barbershop_id": null
  },
  {
    "id": "b6443e0c-eeee-4a5e-b4f5-764aae51bfda",
    "barbershop_id": "892d24f0-3c33-4cdf-988b-e3766982b0ce"
  },
  {
    "id": "78e4b921-7a2b-4d97-845c-6ba173d25baf",
    "barbershop_id": null
  },
  {
    "id": "c75232d2-80c6-470a-85db-63cd061c35bf",
    "barbershop_id": null
  }
]
```

### barbers

- **Total Rows**: 13
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 7

**Sample Records** (first 5):

```json
[
  {
    "id": "56ddbef1-fc3b-4f86-b841-88a8e72e166e",
    "barbershop_id": null
  },
  {
    "id": "8c1939eb-7474-4993-88e5-64f6ff6939a9",
    "barbershop_id": null
  },
  {
    "id": "86d82907-7149-400e-9a5e-938b56a8be95",
    "barbershop_id": null
  },
  {
    "id": "610110ac-cc59-4a13-86f5-2803232c211b",
    "barbershop_id": null
  },
  {
    "id": "d67480a2-577e-452d-b7af-e61b398e0cc9",
    "barbershop_id": null
  }
]
```

### inventory

- **Total Rows**: 3
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 0

**Sample Records** (first 5):

```json
[
  {
    "id": "2f6ffb6b-c21d-4d3d-8b51-747fcb533ff7",
    "barbershop_id": null
  },
  {
    "id": "5a4451f5-69ab-420d-a197-6dd7bdacf3d9",
    "barbershop_id": null
  },
  {
    "id": "d75b51de-2eac-4865-97c5-c82f0f0fcb1c",
    "barbershop_id": null
  }
]
```

### invoice_history

- **Total Rows**: 0
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✗

### payout_history

- **Total Rows**: 0
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✗

### production_barbers

- **Total Rows**: 9
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 7

**Sample Records** (first 5):

```json
[
  {
    "id": "d67480a2-577e-452d-b7af-e61b398e0cc9",
    "barbershop_id": null
  },
  {
    "id": "29b4389a-6e1e-4447-9732-6df4520c5976",
    "barbershop_id": null
  },
  {
    "id": "c5517654-826d-49ad-9a38-5cbfab64de12",
    "barbershop_id": "287d97f9-2c28-43d8-b1ce-6bb989549b75"
  },
  {
    "id": "bcea9cf9-e593-4dbf-a787-1ed74e04dbf5",
    "barbershop_id": "1ca6138d-eae8-46ed-abff-5d6e52fbd21b"
  },
  {
    "id": "b1111111-1111-1111-1111-111111111111",
    "barbershop_id": "c5a58548-8f23-426c-bedc-49a83d238724"
  }
]
```

### user_shop_access_history

- **Total Rows**: 2
- **Has shop_id Column**: ✗
- **Has barbershop_id Column**: ✓
- **barbershop_id Records (non-NULL)**: 2

**Sample Records** (first 5):

```json
[
  {
    "id": "023a5eca-26a9-4d15-ab86-b22e095848a3",
    "barbershop_id": "9306d931-7ab0-45b7-88d5-599678085526"
  },
  {
    "id": "a1e1f0eb-4e90-4846-adeb-5f7ecb2ff54e",
    "barbershop_id": "c5a58548-8f23-426c-bedc-49a83d238724"
  }
]
```

---

## Recommendations

### Next Steps

1. **Review this report** to understand current data distribution
2. **Backup database** before any migration
3. **Execute migration scripts** for tables needing data migration
4. **Drop shop_id columns** from tables ready for cleanup
5. **Update code** to remove all shop_id references
6. **Run tests** to verify no data loss

---

*Report generated by analyze-shop-id-conflict.js*
