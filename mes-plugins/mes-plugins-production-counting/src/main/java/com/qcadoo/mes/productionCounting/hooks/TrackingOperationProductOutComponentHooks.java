/**
 * ***************************************************************************
 * Copyright (c) 2010 Qcadoo Limited
 * Project: Qcadoo MES
 * Version: 1.4
 *
 * This file is part of Qcadoo.
 *
 * Qcadoo is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation; either version 3 of the License,
 * or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty
 * of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 * ***************************************************************************
 */
package com.qcadoo.mes.productionCounting.hooks;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.qcadoo.mes.basic.ParameterService;
import com.qcadoo.mes.basic.constants.ProductFields;
import com.qcadoo.mes.basic.util.ProductUnitsConversionService;
import com.qcadoo.mes.basicProductionCounting.constants.ProductionCountingQuantityRole;
import com.qcadoo.mes.orders.constants.OrderFields;
import com.qcadoo.mes.productionCounting.ProductionCountingService;
import com.qcadoo.mes.productionCounting.SetTrackingOperationProductsComponentsService;
import com.qcadoo.mes.productionCounting.constants.OrderFieldsPC;
import com.qcadoo.mes.productionCounting.constants.ParameterFieldsPC;
import com.qcadoo.mes.productionCounting.constants.ProductionTrackingFields;
import com.qcadoo.mes.productionCounting.constants.TrackingOperationProductInComponentFields;
import com.qcadoo.mes.productionCounting.constants.TrackingOperationProductOutComponentFields;
import com.qcadoo.mes.productionCounting.constants.TypeOfProductionRecording;
import com.qcadoo.mes.productionCounting.hooks.helpers.AbstractPlannedQuantitiesCounter;
import com.qcadoo.model.api.BigDecimalUtils;
import com.qcadoo.model.api.DataDefinition;
import com.qcadoo.model.api.Entity;
import com.qcadoo.model.api.NumberService;

@Service
public class TrackingOperationProductOutComponentHooks extends AbstractPlannedQuantitiesCounter {

    @Autowired
    private NumberService numberService;

    @Autowired
    private ParameterService parameterService;

    @Autowired
    private SetTrackingOperationProductsComponentsService setTrackingOperationProductsComponentsService;

    @Autowired
    private ProductionCountingService productionCountingService;

    @Autowired
    private ProductUnitsConversionService productUnitsConversionService;

    public TrackingOperationProductOutComponentHooks() {
        super(ProductionCountingQuantityRole.PRODUCED);
    }

    public void onView(final DataDefinition trackingOperationProductOutComponentDD,
            final Entity trackingOperationProductOutComponent) {
        fillQuantities(trackingOperationProductOutComponent);
    }

    private void fillQuantities(final Entity trackingOperationProductOutComponent) {

        Entity product = trackingOperationProductOutComponent
                .getBelongsToField(TrackingOperationProductOutComponentFields.PRODUCT);
        Entity productionTracking = trackingOperationProductOutComponent
                .getBelongsToField(TrackingOperationProductOutComponentFields.PRODUCTION_TRACKING);
        Entity order = productionTracking.getBelongsToField(ProductionTrackingFields.ORDER);
        Entity operation = productionTracking.getBelongsToField(ProductionTrackingFields.TECHNOLOGY_OPERATION_COMPONENT);
        BigDecimal plannedQuantity = getPlannedQuantity(trackingOperationProductOutComponent);
        BigDecimal producedSum = productionCountingService.getUsedQuantitySumForProduct(product, order, operation);
        BigDecimal wastesSum = productionCountingService.getWastesSumForProduct(product, order, operation);
        BigDecimal remainingQuantity = plannedQuantity.subtract(producedSum);
        if (BigDecimal.ZERO.compareTo(remainingQuantity) > 0) {
            remainingQuantity = BigDecimal.ZERO;
        }
        trackingOperationProductOutComponent.setField(TrackingOperationProductOutComponentFields.PLANNED_QUANTITY,
                plannedQuantity);
        trackingOperationProductOutComponent.setField(TrackingOperationProductOutComponentFields.WASTES_SUM, wastesSum);
        trackingOperationProductOutComponent.setField(TrackingOperationProductOutComponentFields.PRODUCED_SUM, producedSum);
        trackingOperationProductOutComponent.setField(TrackingOperationProductOutComponentFields.REMAINING_QUANTITY,
                remainingQuantity);

    }

    public void onSave(final DataDefinition trackingOperationProductOutComponentDD, Entity trackingOperationProductOutComponent) {
        fillTrackingOperationProductInComponentsQuantities(trackingOperationProductOutComponent);
        fillSetTrackingOperationProductsInComponents(trackingOperationProductOutComponent);
    }

    private void fillTrackingOperationProductInComponentsQuantities(final Entity trackingOperationProductOutComponent) {
        Entity productionTracking = trackingOperationProductOutComponent
                .getBelongsToField(TrackingOperationProductOutComponentFields.PRODUCTION_TRACKING);

        Entity product = trackingOperationProductOutComponent
                .getBelongsToField(TrackingOperationProductOutComponentFields.PRODUCT);

        if (checkIfShouldfillTrackingOperationProductInComponentsQuantities(trackingOperationProductOutComponent,
                productionTracking, product)) {
            BigDecimal usedQuantity = trackingOperationProductOutComponent
                    .getDecimalField(TrackingOperationProductOutComponentFields.USED_QUANTITY);
            BigDecimal wastesQuantity = trackingOperationProductOutComponent
                    .getDecimalField(TrackingOperationProductOutComponentFields.WASTES_QUANTITY);

            if ((usedQuantity != null) || (wastesQuantity != null)) {
                BigDecimal plannedQuantity = getPlannedQuantity(trackingOperationProductOutComponent);

                BigDecimal quantity = BigDecimalUtils.convertNullToZero(usedQuantity).add(
                        BigDecimalUtils.convertNullToZero(wastesQuantity), numberService.getMathContext());

                BigDecimal ratio = quantity.divide(plannedQuantity, numberService.getMathContext());

                List<Entity> trackingOperationProductInComponents = productionTracking
                        .getHasManyField(ProductionTrackingFields.TRACKING_OPERATION_PRODUCT_IN_COMPONENTS);

                trackingOperationProductInComponents.forEach(trackingOperationProductInComponent -> {
                    fillQuantities(trackingOperationProductInComponent, ratio);
                });
            }
        }
    }

    private boolean checkIfShouldfillTrackingOperationProductInComponentsQuantities(Entity trackingOperationProductOutComponent,
            final Entity productionTracking, final Entity product) {

        Entity order = productionTracking.getBelongsToField(ProductionTrackingFields.ORDER);
        String typeOfProductionRecording = order.getStringField(OrderFieldsPC.TYPE_OF_PRODUCTION_RECORDING);
        Entity orderProduct = order.getBelongsToField(OrderFields.PRODUCT);

        boolean enteredFromTerminal = BooleanUtils.isTrue(trackingOperationProductOutComponent
                .getBooleanField(TrackingOperationProductOutComponentFields.ENTERED_FROM_TERMINAL));

        boolean allowToOverrideQuantitiesFromTerminal = BooleanUtils.isTrue(
                parameterService.getParameter().getBooleanField(ParameterFieldsPC.ALLOW_CHANGES_TO_USED_QUANTITY_ON_TERMINAL));

        return (parameterService.getParameter().getBooleanField(ParameterFieldsPC.CONSUMPTION_OF_RAW_MATERIALS_BASED_ON_STANDARDS)
                && !(enteredFromTerminal && allowToOverrideQuantitiesFromTerminal)
                && (TypeOfProductionRecording.FOR_EACH.getStringValue().equals(typeOfProductionRecording)
                        || (TypeOfProductionRecording.CUMULATED.getStringValue().equals(typeOfProductionRecording)
                                && product.getId().equals(orderProduct.getId()))));
    }

    private void fillQuantities(Entity trackingOperationProductInComponent, final BigDecimal ratio) {
        BigDecimal plannedQuantity = trackingOperationProductInComponent
                .getDecimalField(TrackingOperationProductInComponentFields.PLANNED_QUANTITY);
        BigDecimal usedQuantity = plannedQuantity.multiply(ratio, numberService.getMathContext());

        Optional<BigDecimal> givenQuantity = calculateGivenQuantity(trackingOperationProductInComponent, usedQuantity);

        if (!givenQuantity.isPresent()) {
            trackingOperationProductInComponent.addError(
                    trackingOperationProductInComponent.getDataDefinition().getField(
                            TrackingOperationProductInComponentFields.GIVEN_QUANTITY),
                    "technologies.operationProductInComponent.validate.error.missingUnitConversion");
        }

        trackingOperationProductInComponent.setField(TrackingOperationProductInComponentFields.USED_QUANTITY,
                numberService.setScale(usedQuantity));
        trackingOperationProductInComponent.setField(TrackingOperationProductInComponentFields.GIVEN_QUANTITY,
                numberService.setScale(givenQuantity.orElse(usedQuantity)));

        trackingOperationProductInComponent.getDataDefinition().save(trackingOperationProductInComponent);
    }

    private Optional<BigDecimal> calculateGivenQuantity(final Entity trackingOperationProductInComponent,
            final BigDecimal usedQuantity) {

        Entity product = trackingOperationProductInComponent.getBelongsToField(TrackingOperationProductInComponentFields.PRODUCT);

        String givenUnit = trackingOperationProductInComponent
                .getStringField(TrackingOperationProductInComponentFields.GIVEN_UNIT);

        if (givenUnit == null) {
            String additionalUnit = product.getStringField(ProductFields.ADDITIONAL_UNIT);
            if (StringUtils.isNotEmpty(additionalUnit)) {
                givenUnit = additionalUnit;
            } else {
                givenUnit = product.getStringField(ProductFields.UNIT);
            }
            trackingOperationProductInComponent.setField(TrackingOperationProductInComponentFields.GIVEN_UNIT, givenUnit);
        }
        return productUnitsConversionService.forProduct(product).fromPrimaryUnit().to(givenUnit).convertValue(usedQuantity);

    }

    private void fillSetTrackingOperationProductsInComponents(Entity trackingOperationProductOutComponent) {
        Entity productionTracking = trackingOperationProductOutComponent
                .getBelongsToField(TrackingOperationProductOutComponentFields.PRODUCTION_TRACKING);

        BigDecimal givenQuantity = trackingOperationProductOutComponent
                .getDecimalField(TrackingOperationProductOutComponentFields.GIVEN_QUANTITY);

        trackingOperationProductOutComponent = setTrackingOperationProductsComponentsService
                .recalculateTrackingOperationProductOutComponent(productionTracking, trackingOperationProductOutComponent,
                        givenQuantity);

        List<Entity> setTrackingOperationProductsInComponents = trackingOperationProductOutComponent
                .getHasManyField(TrackingOperationProductOutComponentFields.SET_TRACKING_OPERATION_PRODUCTS_IN_COMPONENTS);

        setTrackingOperationProductsInComponents.forEach(setTrackingOperationProductsInComponent -> {
            setTrackingOperationProductsInComponent.getDataDefinition().save(setTrackingOperationProductsInComponent);
        });
    }

}
