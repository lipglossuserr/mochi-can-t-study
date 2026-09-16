package com.mochi.mochibackend.item.service;

import com.mochi.mochibackend.exception.ItemNotFoundException;
import com.mochi.mochibackend.item.entity.Item;
import com.mochi.mochibackend.item.repository.ItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only access to the furniture/toy/decoration catalog. There is no
 * create/update/delete here on purpose — this sprint seeds the catalog
 * via a Flyway migration (see {@code V9__seed_items.sql}), the same way
 * the food catalog is a checked-in constant rather than something users
 * mutate through the API.
 */
@Service
public class ItemService {

    private final ItemRepository itemRepository;

    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public List<Item> listActive() {
        return itemRepository.findAllByActiveTrue();
    }

    @Transactional(readOnly = true)
    public Item getById(Long itemId) {
        return itemRepository.findById(itemId)
                .orElseThrow(() -> new ItemNotFoundException("Item not found: " + itemId));
    }
}
