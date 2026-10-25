#!/usr/bin/env bash
# Download the VizWiz validation images (3.5 GB) and annotations into eval/data/ (not committed).
# VizWiz-VQA, CC BY 4.0: https://vizwiz.org/tasks-and-datasets/vqa/
set -e
cd "$(dirname "$0")"
mkdir -p data/raw data/images data/annotations
curl -L -o data/raw/Annotations.zip https://vizwiz.cs.colorado.edu/VizWiz_final/vqa_data/Annotations.zip
curl -L -C - -o data/raw/val.zip https://vizwiz.cs.colorado.edu/VizWiz_final/images/val.zip
unzip -q -o data/raw/Annotations.zip -d data/annotations
unzip -q -o data/raw/val.zip -d data/images
echo "Done. Images: data/images/val  Annotations: data/annotations/val.json"
