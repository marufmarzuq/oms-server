#! /bin/bash

######### Removing existing .env file ######################
rm .env

######## Finalising target environment #####################
read -p "Enter target server Dev/Uat/Prod?:" target_server
target_server_caps=`echo ${target_server} | tr '[a-z]' '[A-Z]'`
echo ${target_server_caps}


if [ "$target_server_caps" = 'DEV' ]; then
    cp 'env_dev' '.env'
elif [ "$target_server_caps" = 'UAT' ]; then
    cp 'env_uat' '.env'
elif [ "$target_server_caps" = 'PROD' ]; then
    cp 'env_prod' '.env'
else
    echo "ERROR: Please re-run the script and choose proper options"
    exit 1
fi

if [ ! -f '.env' ]
then 
  echo "ERROR: seems like environment file is missing"
fi

cp 'envrc' '.envrc'
if [ ! -f '.envrc' ]
then 
  echo "ERROR: seems like environment file - .envrc is missing"
fi

########### Variables ######################################
export PROJECT_ID=aqai-oms-dashboard
export CONTAINER_TAG=node-server
export REGION=us-central1
export CLOUD_SERVICE_NAME=`grep CLOUD_RUN_ORDERS_SERVICE_NAME '.env' | awk -F"=" '{ print $2 }'`

########## SERVICE ACCOUNT LOGIN ###########################
gcloud auth activate-service-account aqai-oms-service@aqai-oms-dashboard.iam.gserviceaccount.com \
  --key-file=aqai-oms-dashboard-469125cee0b4.json


########## Build Docker container and tag in GCR ############
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/$CONTAINER_TAG:latest \
  --project $PROJECT_ID


######### Deploy container in Cloud Run ######################
gcloud run deploy $CLOUD_SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$CONTAINER_TAG \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID