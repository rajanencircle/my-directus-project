const mysql = require('mysql2/promise');
const { createDirectus, rest, createItem, readItems } = require('@directus/sdk');

const DIRECTUS_URL = 'http://localhost:8055';
const DIRECTUS_STATIC_TOKEN = 'jme_U0tFPnhuddKUz2p5-xqnu2IZY6Sj';
const BATCH_SIZE = 100;

const MYSQL_CONFIG = {
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'botg',
	typeCast: function (field, next) {
		if (field.type === 'TEXT' || field.type === 'TINY_BLOB' || field.type === 'MEDIUM_BLOB' || field.type === 'LONG_BLOB') {
			return field.string();
		}
		return next();
	},
};

// Mapping from MySQL field_XXX_1 to Directus field names
const FIELD_MAPPING = {
	field_41_1: 'name',
	field_1017_1: 'state_short',
	field_1030_1: 'booking_info',
	field_1031_1: 'country',
	field_1032_1: 'region',
	field_1144_1: 'partner_id_filter',
	field_1178_1: 'id_tour_user',
	field_1266_1: 'headline_1',
	field_1267_1: 'text_1',
	field_1268_1: 'headline_2',
	field_1269_1: 'text_2',
	field_1270_1: 'pkt_headline_1',
	field_1271_1: 'pkt_text_1',
	field_1272_1: 'pkt_headline_2',
	field_1273_1: 'pkt_text_2',
	field_131_1: 'internal_remarks',
	field_1335_1: 'web_preisrechner',
	field_1342_1: 'location_tour32',
	field_1375_1: 'children_max_age_no_cost',
	field_1376_1: 'total_number_of_rooms',
	field_1378_1: 'anzahl_kinder_kostenfrei',
	field_1383_1: 'haupt_id_tour_user',
	field_1390_1: 'hotel_different_cancel_conditions',
	field_1402_1: 'hotel_activities',
	field_1405_1: 'hotel_group',
	field_1424_1: 'price_sample_hotel',
	field_1432_1: 'price_sample_footnote_hotel',
	field_1459_1: 'hotel_url_alias',
	field_1487_1: 'hotel_picinfo_teaser',
	field_1488_1: 'hotel_picinfo_detail',
	field_1490_1: 'hotel_picinfo_state',
	field_1529_1: 'mobility_advice_text',
	field_169_1: 'hotel_name',
	field_171_1: 'zip_code',
	field_218_1: 'phone_ah',
	field_26_1: 'street',
	field_27_1: 'street_number',
	field_28_1: 'town',
	field_29_1: 'state',
	field_31_1: 'phone_general',
	field_32_1: 'fax_general',
	field_364_1: 'smiley',
	field_365_1: 'booking',
	field_366_1: 'bank_name',
	field_367_1: 'bank_branch',
	field_368_1: 'bank_street',
	field_369_1: 'bank_street_number',
	field_36_1: 'website',
	field_370_1: 'bank_city',
	field_371_1: 'bank_zip_code',
	field_372_1: 'bank_country',
	field_373_1: 'bank_account_number',
	field_374_1: 'bank_owner',
	field_375_1: 'bank_bank_code',
	field_376_1: 'bank_swift_code',
	field_377_1: 'bank_iban',
	field_378_1: 'bank_currency',
	field_379_1: 'bank_payment_conditions',
	field_40_1: 'it_code',
	field_42_1: 'email_general',
	field_49_1: 'res_phone',
	field_50_1: 'res_fax',
	field_51_1: 'res_email_1',
	field_52_1: 'res_contact_titel',
	field_53_1: 'res_contact_greeting',
	field_54_1: 'res_contact_firstname',
	field_55_1: 'res_contact_name',
	field_56_1: 'res_email_2',
	field_57_1: 'brox_subline_city',
	field_58_1: 'introduction_text',
	field_59_1: 'location',
	field_60_1: 'room',
	field_61_1: 'access',
	field_63_1: 'included_services',
	field_64_1: 'not_included',
	field_65_1: 'minimum_stay',
	field_661_1: 'brox_headline',
	field_662_1: 'brox_subline',
	field_665_1: 'brox_colour',
	field_67_1: 'note',
	field_68_1: 'children',
	field_74_1: 'accommodation_type',
	field_75_1: 'classification',
	field_804_1: 'brox_category',
};

// Build SELECT clause with all mapped fields
function buildSelectClause() {
	const fields = ['h.oid'];
	for (const [mysqlField] of Object.entries(FIELD_MAPPING)) {
		fields.push(`h.${mysqlField}`);
	}
	// Add date fields (pair fields)
	fields.push('h.field_1425_1', 'h.field_1425_2', 'h.field_1443_1', 'h.field_1443_2', 'h.field_1508_1', 'h.field_1508_2', 'h.field_1513_1', 'h.field_1513_2');
	return fields.join(', ');
}

function mapRowToDirectus(row) {
	const data = { object_id: Number(row.oid) };

	for (const [mysqlField, directusField] of Object.entries(FIELD_MAPPING)) {
		const value = row[mysqlField];
		if (value !== null && value !== undefined && value !== '') {
			// Clean whitespace for string fields
			if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed !== '') {
					data[directusField] = trimmed;
				}
			} else {
				data[directusField] = value;
			}
		}
	}

	// Map date pair fields
	if (row.field_1425_1) data.price_sample_1_date_from = row.field_1425_1;
	if (row.field_1425_2) data.price_sample_1_date_to = row.field_1425_2;
	if (row.field_1443_1) data.price_sample_2_date_from = row.field_1443_1;
	if (row.field_1443_2) data.price_sample_2_date_to = row.field_1443_2;
	if (row.field_1508_1) data.image_badge_start_date = row.field_1508_1;
	if (row.field_1508_2) data.image_badge_end_date = row.field_1508_2;
	if (row.field_1513_1) data.price_sample_3_date_from = row.field_1513_1;
	if (row.field_1513_2) data.price_sample_3_date_to = row.field_1513_2;

	return data;
}

async function migrateHotels() {
	const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
	const directus = createDirectus(DIRECTUS_URL, { globals: { token: DIRECTUS_STATIC_TOKEN } }).with(rest());

	try {
		console.log('Connected to MySQL and Directus');

		const selectClause = buildSelectClause();
		const [rows] = await mysqlConn.query(`
			SELECT ${selectClause}
			FROM botg.hotels h
			INNER JOIN (
				SELECT oid
				FROM botg.hotels
				WHERE language = 'D'
				GROUP BY oid
			) base ON h.oid = base.oid
			WHERE h.language = 'D'
		`);

		console.log(`Found ${rows.length} hotels with language 'D'`);

		const existingHotels = await directus.request(
			readItems('hotels', {
				fields: ['id', 'object_id'],
				limit: -1,
			})
		);

		const existingMap = new Map();
		for (const hotel of existingHotels) {
			if (hotel.object_id) {
				existingMap.set(Number(hotel.object_id), hotel.id);
			}
		}

		const toCreate = [];
		const toUpdate = [];
		let skipped = 0;

		for (const row of rows) {
			const objectId = Number(row.oid);
			const mappedData = mapRowToDirectus(row);

			if (!mappedData.name || mappedData.name.trim() === '') {
				skipped++;
				continue;
			}

			const existingId = existingMap.get(objectId);

			if (existingId) {
				toUpdate.push({ id: existingId, ...mappedData });
			} else {
				toCreate.push(mappedData);
			}
		}

		console.log(`To create: ${toCreate.length}, To update: ${toUpdate.length}, Skipped: ${skipped}`);

		let created = 0;
		for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
			const batch = toCreate.slice(i, i + BATCH_SIZE);
			await directus.request(createItem('hotels', batch));
			created += batch.length;
			console.log(`Created ${created}/${toCreate.length}`);
		}

		let updated = 0;
		for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
			const batch = toUpdate.slice(i, i + BATCH_SIZE);
			const response = await fetch(`${DIRECTUS_URL}/items/hotels`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${DIRECTUS_STATIC_TOKEN}`,
				},
				body: JSON.stringify(batch),
			});
			if (!response.ok) {
				const error = await response.text();
				console.error(`Batch update failed at offset ${i}:`, error);
			}
			updated += batch.length;
			console.log(`Updated ${updated}/${toUpdate.length}`);
		}

		console.log(`Migration complete:`);
		console.log(`  Created: ${created}`);
		console.log(`  Updated: ${updated}`);
		console.log(`  Skipped: ${skipped}`);
	} catch (error) {
		console.error('Migration failed:', error.message);
		throw error;
	} finally {
		await mysqlConn.end();
	}
}

migrateHotels()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
