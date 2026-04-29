#!/bin/bash

echo "Importing dump from botg.de"
curl https://www.botg.de/fileadmin/bestof.dump --output bestof.sql.gz
gunzip bestof.sql.gz
sed -i '1d' bestof.sql
mysql -u root botg -h 127.0.0.1 -P 3306 < bestof.sql
rm bestof.sql.gz
rm bestof.sql

echo "Importing dump from karawane-primarix.de"
curl https://www.karawane-primarix.de/downloads/karawane.dump --output karawane.sql.gz
gunzip karawane.sql.gz
sed -i '1d' karawane.sql
mysql -u root karawane -h 127.0.0.1 -P 3306 < karawane.sql
rm karawane.sql.gz
rm karawane.sql